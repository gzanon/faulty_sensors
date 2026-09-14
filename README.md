# Faulty Sensors

PWA para catalogar sensores defeituosos em campo: fotografa as 6 faces do sensor, identifica o ID automaticamente (QR code nativo do Android, com OCR como reserva), organiza os arquivos e ajuda a registrar os dados sem precisar de acesso de administrador ou backend próprio.

**App publicado:** https://gzanon.github.io/faulty_sensors/

## Como funciona (visão geral)

1. No celular, o app tira as 6 fotos do sensor e identifica o ID pela etiqueta.
2. Você compartilha as fotos e um arquivo `.txt` (com um `INSERT SQL`) para uma pasta do OneDrive, usando o "Compartilhar" nativo do Android.
3. Pode catalogar vários sensores em sequência ("Novo sensor" guarda o atual numa fila local e já parte para o próximo) e compartilhar tudo de uma vez depois, pela tela "Fila de sensores pendentes".
4. Aqui no PC, o script `tools/consolidate-sql.mjs` junta os arquivos `.txt`/`.sql` dessa pasta num banco SQLite único (`sensores.db`).

## Ambiente de desenvolvimento (sem admin)

Este projeto foi montado numa máquina sem Node.js/Git instalados e sem permissão de administrador. A solução:

- **Node.js portátil** (zip, não o instalador `.msi`) extraído em `C:\Users\<usuário>\tools\node`, adicionado ao `PATH` do usuário.
- **Git portátil** (PortableGit) extraído em `C:\Users\<usuário>\tools\PortableGit`, idem.
- **GitHub CLI portátil** (`gh`) em `C:\Users\<usuário>\tools\gh`, para criar/gerenciar o repositório e acompanhar os deploys sem precisar abrir o navegador toda hora.
- **Certificado da empresa**: a rede corporativa faz inspeção de tráfego HTTPS (Netskope/Forcepoint), o que quebrava o `npm install` com erro de certificado. A correção foi exportar os certificados raiz corporativos (via PowerShell, `Cert:\LocalMachine\Root`) para um arquivo `.pem` e apontar a variável de ambiente `NODE_EXTRA_CA_CERTS` para ele (configurada uma vez no usuário do Windows).

Depois disso, os comandos normais funcionam:

```powershell
npm install
npm run dev      # ambiente local de desenvolvimento
npm run build    # build de produção (o que o GitHub Actions roda)
```

## Publicação

Qualquer `git push` na branch `main` dispara um workflow do GitHub Actions (`.github/workflows/deploy.yml`) que builda o projeto e publica no GitHub Pages automaticamente. Não é preciso fazer deploy manual.

## Consolidação do SQL (script local, roda no PC)

O `tools/consolidate-sql.mjs` lê os arquivos `.sql`/`.txt` de uma pasta, executa cada um contra um banco SQLite (criando a tabela `sensores` se não existir) e move os arquivos já processados para uma subpasta `importados/`.

```powershell
npm run consolidate-sql -- "<caminho da pasta>"
```

**Para não digitar o caminho toda vez**, defina a variável de ambiente `FAULTY_SENSORS_SQL_FOLDER` no seu usuário do Windows com o caminho da pasta (normalmente a mesma pasta do OneDrive para onde o celular compartilha os arquivos). Com ela definida, basta rodar:

```powershell
npm run consolidate-sql
```

> Esse caminho é específico da sua empresa/pasta e **não deve ser colocado no código nem commitado** — por isso ele mora só numa variável de ambiente local, nunca no repositório (que é público no GitHub).

Depois de consolidado, o `sensores.db` pode ser aberto com o [DB Browser for SQLite](https://sqlitebrowser.org/) (gratuito) para consultar os dados.

## Estrutura do projeto

```
src/
  steps/       telas do fluxo (wizard) do PWA
  services/    câmera, OCR, QR, compartilhamento, exportação SQL, armazenamento local
  state/       estado da sessão atual em edição
  types/       tipos compartilhados (Face, SensorSession, QueuedSensor...)
tools/
  consolidate-sql.mjs   script local de consolidação (não roda no navegador)
public/tesseract/       modelos e worker do Tesseract.js (self-hosted)
```
