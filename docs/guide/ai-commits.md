# AI-Assisted Commits

Generate commit messages using AI.

## Supported Providers

- **Claude** (Anthropic)
- **OpenAI** (GPT-4, GPT-3.5)
- **Ollama** (Local models)

## Setup

### Claude
1. Go to **Settings > AI**
2. Select **Claude**
3. Enter your Anthropic API key

### OpenAI
1. Go to **Settings > AI**
2. Select **OpenAI**
3. Enter your OpenAI API key
4. Choose model (GPT-4 recommended)

### Ollama
1. Install [Ollama](https://ollama.ai)
2. Pull a model: `ollama pull llama2`
3. In Axis, select **Ollama**
4. Choose your local model

## Generating Messages

1. Stage your changes
2. Click the **AI** button next to the commit field
3. Review the generated message
4. Edit if needed
5. Commit

## Tips

- Stage related changes together for better messages
- Review and adjust AI suggestions
- Use for inspiration, not blind acceptance
