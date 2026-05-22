import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

dotenv.config();

const app = express();

const httpServer =
  createServer(app);

const io = new Server(
  httpServer,
  {
    cors: {
      origin: "*"
    }
  }
);

const PORT =
  process.env.PORT || 3000;


// MIDDLEWARE

app.use(cors());

app.use(express.json({
  limit: "2mb"
}));


// ROOT

app.get("/", (req, res) => {

  res.json({

    success: true,

    message:
      "Backend Running Successfully"

  });

});


// FUNCTION

async function processAI(prompt){

  const finalPrompt = `
You are an AI Training Procurement Assistant.

Analyze the training requirement carefully.

Return ONLY valid JSON.

{
  "course": "",
  "delivery": "",
  "trainingLevel": "",
  "participants": "",
  "audience": "",
  "duration": "",
  "timeline": "",
  "location": "",
  "objectives": "",
  "modules": [],
  "requirements": [],
  "summary": ""
}

USER REQUIREMENT:
${prompt}
`;

  const response =
    await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {

        method: "POST",

        headers: {

          Authorization:
            `Bearer ${process.env.GROQ_API_KEY}`,

          "Content-Type":
            "application/json"

        },

        body: JSON.stringify({

          model:
            "llama-3.3-70b-versatile",

          messages: [

            {
              role: "system",
              content:
                "Return ONLY valid JSON."
            },

            {
              role: "user",
              content:
                finalPrompt
            }

          ],

          temperature: 0.4

        })

      }
    );

  const result =
    await response.json();

  let aiText =
    result.choices?.[0]
    ?.message?.content || "";

  aiText = aiText
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace =
    aiText.indexOf("{");

  const lastBrace =
    aiText.lastIndexOf("}");

  const jsonString =
    aiText.substring(
      firstBrace,
      lastBrace + 1
    );

  const parsedData =
    JSON.parse(jsonString);

  return {

    course:
      parsedData.course || "",

    delivery:
      parsedData.delivery || "",

    trainingLevel:
      parsedData.trainingLevel || "",

    participants:
      parsedData.participants || "",

    audience:
      parsedData.audience || "",

    duration:
      parsedData.duration || "",

    timeline:
      parsedData.timeline || "",

    location:
      parsedData.location || "",

    objectives:
      parsedData.objectives || "",

    summary:
      parsedData.summary || "",

    modules:
      Array.isArray(parsedData.modules)
        ? parsedData.modules
        : [],

    requirements:
      Array.isArray(parsedData.requirements)
        ? parsedData.requirements
        : []

  };

}


// MANUAL GENERATE

app.post("/generate", async (req, res) => {

  try {

    const { prompt } =
      req.body;

    if(!prompt){

      return res.status(400)
      .json({
        error:
          "Prompt Required"
      });

    }

    const data =
      await processAI(prompt);

    io.emit(
      "newRequirement",
      {
        ...data,
        source:
          "Manual Input"
      }
    );

    return res.json(data);

  }
  catch(error){

    console.log(error);

    return res.status(500)
    .json({
      error:
        error.message
    });

  }

});


// WHATSAPP VERIFY

app.get("/webhook", (req, res) => {

  const VERIFY_TOKEN =
    process.env.VERIFY_TOKEN;

  const mode =
    req.query["hub.mode"];

  const token =
    req.query["hub.verify_token"];

  const challenge =
    req.query["hub.challenge"];

  if(
    mode === "subscribe" &&
    token === VERIFY_TOKEN
  ){

    return res
      .status(200)
      .send(challenge);

  }

  res.sendStatus(403);

});


// WHATSAPP RECEIVE

app.post("/webhook", async (req, res) => {

  try {

    const message =
      req.body.entry?.[0]
      ?.changes?.[0]
      ?.value?.messages?.[0]
      ?.text?.body;

    if(!message){

      return res.sendStatus(200);

    }

    console.log(
      "WhatsApp Message:",
      message
    );

    const data =
      await processAI(message);

    io.emit(
      "newRequirement",
      {
        ...data,
        source:
          "WhatsApp"
      }
    );

    res.sendStatus(200);

  }
  catch(error){

    console.log(error);

    res.sendStatus(500);

  }

});


// SOCKET

io.on(
  "connection",
  () => {

    console.log(
      "Frontend Connected"
    );

  }
);


// START

httpServer.listen(PORT, () => {

  console.log(
    `Server Running On ${PORT}`
  );

});