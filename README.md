# App query

App genérico para orquestrar prompts/consultas usando o SDK DocGo.

## Estrutura

```
app-query/
  manifest.json
  src/index.ts
  dist/index.js (gerado)
  package.json
  tsconfig.json
```

## Função Principal

Declarada no `manifest.json` apontando para `dist/index.js`.
Fornece um exemplo de como ler parâmetros e responder via `docgo.result`.

## Execução

```
./docgo query <function> [params]
```

## Desenvolvimento

```
npm install
npm run build
```

Durante desenvolvimento pode usar:

```
DOCGO_FUNCTION=minhaFunc DOCGO_MANIFEST_PATH=./manifest.json DOCGO_PARAMS='["arg1"]' node dist/index.js
```

(Ou deixar o SDK inferir função se separar scripts.)

## Próximos Passos

- Adicionar múltiplas funções demonstrativas (ex: summarize, classify).
- Exemplos de uso de `callApp` para compor com outros apps (ex: jusbr).
- Tests unitários.

## Licença

MIT.
