import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

console.log("TOKEN:", process.env.HUGGINGFACE_API_KEY);

async function testHF() {
  try {
    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/google/flan-t5-xl",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputs: "Test successful"
        })
      }
    );

    const data = await response.json();
    console.log(data);
  } catch (err) {
    console.error(err);
  }
}





testHF();