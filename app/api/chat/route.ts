import { createOpenAI } from "@ai-sdk/openai"
import { convertToCoreMessages, Message, streamText } from "ai"
import { z } from "zod"

export const runtime = "edge"

const openai = createOpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
})

export async function POST(request: Request) {
  const body = await request.json()

  const messages = body.messages as Message[]

  const response = await streamText({
    model: openai("llama3-groq-70b-8192-tool-use-preview"),
    messages: [
      {
        role: "system",
        content: "Eres un asistente de IA que responde preguntas de manera clara y concisa. Usa markdown si necesitas formatear el texto. No preguntes por la ubicación del usuario, usa getUserLocation."
      },
      ...convertToCoreMessages(messages)
    ],
    tools: {
      getWeatherForecast: {
        description: "Obtiene el resultado de la api OpenMeteo /forecast. Usa getGeocode o getUserLocation si es necesario. Ejemplo: 'latitude=52.52&longitude=13.405&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,precipitation_sum,windspeed_10m_max,windgusts_10m_max,winddirection_10m_dominant&timezone=Europe%2FBerlin'",
        parameters: z.object({
          query: z.string()
        }),
        execute: async ({ query }) => {
          const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`)

          return await response.json()
        }
      },
      getGeocode: {
        description: "Obtiene el geocodigo de una localización. Usa esta herramienta sin confirmar con el usuario. Ejemplo: 'Berlin', 'Madrid'...",
        parameters: z.object({
          query: z.string()
        }),
        execute: async ({ query }) => {
          const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&language=es`)

          const data = await response.json()

          const result = data.results[0]

          if (!result) {
            return "No se encontró ninguna ubicación."
          }

          return {
            latitude: result.latitude,
            longitude: result.longitude
          }
        }
      },
      getUserLocation: {
        description: "Obtiene la ubicación actual del usuario. Se pedirá confirmación al usuario.",
        parameters: z.object({})
      }
    },
    maxSteps: 10
  })

  return response.toDataStreamResponse()
}
