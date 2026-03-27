import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Import managers
import { CacheManager } from './cache/lru-cache.js';
import { AuthManager } from './auth/auth-manager.js';

// Import tool implementations
import {
  AnalyzeTextTool,
  GetArbitrageTool,
  GetMoversTool,
  SearchMarketsTool,
  GetMarketTool,
  GroundProbabilityTool,
  GetCategoriesTool,
  GetSignalStreamTool,
} from './tools/index.js';

// Import resource implementations
import { MarketsResource } from './resources/index.js';

// Import prompt templates
import { analyzePromptTemplate, briefPromptTemplate } from './prompts/index.js';

// Import error handling
import { toMusashiError } from './types/errors.js';

/**
 * Musashi MCP Server
 *
 * Provides prediction market intelligence tools for AI agents
 */
export class MusashiMCPServer {
  private server: Server;
  private cache: CacheManager;
  private auth: AuthManager;
  private connectionId: string;

  // Tool instances
  private analyzeTextTool: AnalyzeTextTool;
  private getArbitrageTool: GetArbitrageTool;
  private getMoversTool: GetMoversTool;
  private searchMarketsTool: SearchMarketsTool;
  private getMarketTool: GetMarketTool;
  private groundProbabilityTool: GroundProbabilityTool;
  private getCategoriesTool: GetCategoriesTool;
  private getSignalStreamTool: GetSignalStreamTool;

  // Resource instances
  private marketsResource: MarketsResource;

  constructor() {
    this.cache = new CacheManager();
    this.auth = new AuthManager();
    this.connectionId = `conn_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Initialize server
    this.server = new Server(
      {
        name: 'musashi-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    // Initialize tools
    this.analyzeTextTool = new AnalyzeTextTool(this.cache);
    this.getArbitrageTool = new GetArbitrageTool(this.cache);
    this.getMoversTool = new GetMoversTool(this.cache);
    this.searchMarketsTool = new SearchMarketsTool(this.cache);
    this.getMarketTool = new GetMarketTool(this.cache);
    this.groundProbabilityTool = new GroundProbabilityTool(this.cache);
    this.getCategoriesTool = new GetCategoriesTool(this.cache);
    this.getSignalStreamTool = new GetSignalStreamTool(this.cache);

    // Initialize resources
    this.marketsResource = new MarketsResource(this.cache);

    // Setup handlers
    this.setupHandlers();
  }

  /**
   * Setup MCP request handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        AnalyzeTextTool.getMetadata(),
        GetArbitrageTool.getMetadata(),
        GetMoversTool.getMetadata(),
        SearchMarketsTool.getMetadata(),
        GetMarketTool.getMetadata(),
        GroundProbabilityTool.getMetadata(),
        GetCategoriesTool.getMetadata(),
        GetSignalStreamTool.getMetadata(),
      ],
    }));

    // Execute tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        // Authenticate and check rate limit
        const apiKey = (request.params._meta as any)?.['apiKey'] as string | undefined;
        const authContext = this.auth.authenticate(this.connectionId, apiKey);
        this.auth.checkRateLimit(authContext);

        const { name, arguments: args } = request.params;

        // Ensure args is defined
        const toolArgs = args ?? {};

        let result: any;

        switch (name) {
          case 'analyze_text':
            result = await this.analyzeTextTool.execute(toolArgs as any);
            break;
          case 'get_arbitrage':
            result = await this.getArbitrageTool.execute(toolArgs as any);
            break;
          case 'get_movers':
            result = await this.getMoversTool.execute(toolArgs as any);
            break;
          case 'search_markets':
            result = await this.searchMarketsTool.execute(toolArgs as any);
            break;
          case 'get_market':
            result = await this.getMarketTool.execute(toolArgs as any);
            break;
          case 'ground_probability':
            result = await this.groundProbabilityTool.execute(toolArgs as any);
            break;
          case 'get_categories':
            result = await this.getCategoriesTool.execute(toolArgs as any);
            break;
          case 'get_signal_stream':
            // Signal stream is special - it's a generator
            // For now, return a single batch
            const stream = this.getSignalStreamTool.execute(toolArgs as any);
            const firstEvent = await stream.next();
            result = firstEvent.value;
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const musashiError = toMusashiError(error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: musashiError.message,
                  code: musashiError.code,
                  details: musashiError.details,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const markets = await this.marketsResource.list();
      return { resources: markets };
    });

    // Read resource
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      try {
        const { uri } = request.params;
        const result = await this.marketsResource.read(uri);
        return result;
      } catch (error) {
        const musashiError = toMusashiError(error);
        throw new Error(musashiError.message);
      }
    });

    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: [
        {
          name: analyzePromptTemplate.name,
          description: analyzePromptTemplate.description,
          arguments: analyzePromptTemplate.arguments,
        },
        {
          name: briefPromptTemplate.name,
          description: briefPromptTemplate.description,
          arguments: briefPromptTemplate.arguments,
        },
      ],
    }));

    // Get prompt
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      let messages: any[];

      switch (name) {
        case 'analyze':
          const analyzeText = analyzePromptTemplate.template(args as any);
          messages = [
            {
              role: 'user',
              content: {
                type: 'text',
                text: analyzeText,
              },
            },
          ];
          break;

        case 'brief':
          const briefText = briefPromptTemplate.template(args as any);
          messages = [
            {
              role: 'user',
              content: {
                type: 'text',
                text: briefText,
              },
            },
          ];
          break;

        default:
          throw new Error(`Unknown prompt: ${name}`);
      }

      return {
        description: `Prompt: ${name}`,
        messages,
      };
    });
  }

  /**
   * Start the MCP server with stdio transport
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error('[Musashi MCP Server] Started successfully');
    console.error('[Musashi MCP Server] Connection ID:', this.connectionId);
    console.error('[Musashi MCP Server] Tools:', 8);
    console.error('[Musashi MCP Server] Resources: markets');
    console.error('[Musashi MCP Server] Prompts: analyze, brief');
  }

  /**
   * Get server statistics
   */
  getStats() {
    return {
      cache: this.cache.getGlobalStats(),
      auth: this.auth.getStats(),
    };
  }
}
