"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useChat } from "ai/react"
import { SendIcon } from "lucide-react"
import { useState } from "react"
import Markdown from "react-markdown"

export default function Home() {
  const { messages, append, addToolResult } = useChat({
    api: "/api/chat"
  })

  return (
    <main className="grid grid-rows-[auto_1fr_auto] h-svh p-4 gap-y-4">
      <h1 className="text-xl font-bold">Our ChatGPT</h1>

      <main className="rounded-lg p-3 border flex flex-col-reverse gap-y-4 items-start overflow-y-auto">
        {messages.toReversed().map((message) => (
          <div key={message.id} className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase">{message.role}</p>

            {message.toolInvocations?.map((toolInvocation) => {
              if (toolInvocation.state === "result" || "result" in toolInvocation) {
                return (
                  <pre key={toolInvocation.toolCallId}>{toolInvocation.toolName}</pre>
                )
              }

              if (toolInvocation.toolName === "getUserLocation") {
                return (
                  <div key={toolInvocation.toolCallId} className="space-y-2">
                    <p>¿Quieres compartir tu ubicación con el asistente?</p>

                    <div className="flex justify-center gap-x-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          addToolResult({
                            toolCallId: toolInvocation.toolCallId,
                            result: {
                              error: "Cancelado por el usuario"
                            }
                          })
                        }}>
                        Cancelar
                      </Button>
                      <Button
                        onClick={async () => {
                          const permission = await navigator.permissions.query({ name: "geolocation" })
                          console.log(permission)
                          if (permission.state !== "granted") {
                            addToolResult({
                              toolCallId: toolInvocation.toolCallId,
                              result: {
                                error: "No se ha dado el acceso a la ubicación"
                              }
                            })
                            return
                          }
                          navigator.geolocation.getCurrentPosition((position) => {
                            addToolResult({
                              toolCallId: toolInvocation.toolCallId,
                              result: {
                                location: {
                                  latitude: position.coords.latitude,
                                  longitude: position.coords.longitude
                                }
                              }
                            })
                          })
                        }}>
                        Compartir ubicación
                      </Button>
                    </div>
                  </div>
                )
              }

              return null
            })}

            {message.content && <Markdown className="prose">{message.content}</Markdown>}
          </div>
        ))}
      </main>

      <form className="flex gap-x-2" onSubmit={(e) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)

        append({
          role: "user",
          content: formData.get("message") as string
        })

        e.currentTarget.reset()
      }}>
        <Input
          name="message"
          className="flex-1"
          placeholder="Pregunta cualquier cosa..."
        />

        <Button type="submit" size="icon">
          <SendIcon className="!size-5" />
        </Button>
      </form>
    </main>
  )
}

function Example() {
  const { messages, addToolResult } = useChat({
    api: "/api/chat"
  })

  return <div>
    {messages.map((message) => {
      if (message.role === "assistant") {
        if (message.toolInvocations?.length) {
          return <>
            {message.toolInvocations.map((toolInvocation) => {
              if (toolInvocation.state === "call" && !("result" in toolInvocation)) {
                if (toolInvocation.toolName === "getDate") {
                  return (
                    <button
                      key={toolInvocation.toolCallId}
                      onClick={() => {
                        addToolResult({
                          toolCallId: toolInvocation.toolCallId,
                          result: new Date().toLocaleDateString()
                        })
                      }}>
                      Proveer fecha actual al usuario
                    </button>
                  )
                }
              }
            })}
          </>
        }
      }

      return (
        <p key={message.id}>
          {message.content}
        </p>
      )
    })}
  </div>
}