import docgo from "docgo-sdk";
import OpenAI from "openai";

interface MCPTool {
  app: string;
  function: string;
  description: string;
  parameters: any;
}

async function executePrompt() {
  try {
    // Valida parâmetros
    const validation = docgo.validateParams();
    if (!validation.valid) {
      console.log(docgo.result(false, null, validation.error));
      return;
    }

    const prompt = docgo.getParam("prompt") as string;
    const context = docgo.getParam("context") || {};

    docgo.info("Executando prompt", { prompt: prompt.substring(0, 100) });

    // Configuração OpenAI
    const openai = new OpenAI({
      apiKey: docgo.getEnv("OPENAI_API_KEY") || "",
    });

    // Descobrir ferramentas MCP disponíveis
    const mcpTools = await discoverMCPTools();

    // Preparar ferramentas para o ChatGPT
    const tools = mcpTools.map((tool) => ({
      type: "function" as const,
      function: {
        name: `${tool.app}_${tool.function}`,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));

    // Criar mensagem com contexto
    const messages: any[] = [
      {
        role: "system",
        content: `You are a helpful assistant with access to various DocGo apps via MCP. 
                         Available apps and their functions have been provided as tools you can call.
                         Context: ${JSON.stringify(context)}`,
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    // Chamar OpenAI com ferramentas
    const response = await openai.chat.completions.create({
      model: docgo.getVariable("model") || "gpt-4-turbo-preview",
      messages: messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? "auto" : undefined,
      max_tokens: parseInt(docgo.getVariable("max_tokens") || "2000"),
      temperature: parseFloat(docgo.getVariable("temperature") || "0.7"),
    });

    const message = response.choices[0].message;

    // Processar chamadas de ferramentas se houver
    if (message.tool_calls) {
      const toolResults = [];

      for (const toolCall of message.tool_calls) {
        const [appName, functionName] = toolCall.function.name.split("_");
        const args = JSON.parse(toolCall.function.arguments);

        docgo.info("Chamando app via MCP", {
          app: appName,
          function: functionName,
        });

        try {
          const result = await docgo.callApp(
            appName,
            functionName,
            Object.values(args)
          );
          toolResults.push({
            tool_call_id: toolCall.id,
            result: result,
          });
        } catch (error: any) {
          toolResults.push({
            tool_call_id: toolCall.id,
            error: error.message,
          });
        }
      }

      // Segunda chamada com resultados das ferramentas
      messages.push(message);
      messages.push({
        role: "tool",
        content: JSON.stringify(toolResults),
      });

      const finalResponse = await openai.chat.completions.create({
        model: docgo.getVariable("model") || "gpt-4-turbo-preview",
        messages: messages,
        max_tokens: parseInt(docgo.getVariable("max_tokens") || "2000"),
      });

      console.log(
        docgo.result(true, {
          response: finalResponse.choices[0].message.content,
          tool_calls: toolResults,
        })
      );
    } else {
      console.log(
        docgo.result(true, {
          response: message.content,
        })
      );
    }
  } catch (error: any) {
    docgo.error("Erro ao executar prompt", { error: error.message });
    console.log(docgo.result(false, null, error.message));
  }
}

async function discoverMCPTools(): Promise<MCPTool[]> {
  // Descobrir apps disponíveis e suas ferramentas MCP
  const tools: MCPTool[] = [];

  try {
    // Buscar lista de apps via endpoint MCP
    const response = await fetch(
      `http://localhost:${docgo.getEnv("MCP_PORT") || "9000"}/mcp/tools`
    );
    if (response.ok) {
      const data = (await response.json()) as { tools?: MCPTool[] };
      return data.tools || [];
    }
  } catch (error) {
    docgo.debug("Não foi possível descobrir ferramentas MCP", { error });
  }

  return tools;
}

executePrompt();
