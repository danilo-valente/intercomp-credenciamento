### Instalar Node.js

Seguir as instruções deste projeto: [NVM](https://github.com/nvm-sh/nvm#installing-and-updating) e execute os seguintes comandos:

```
nvm install 14.4
nvm use 14.4
npm install
```

### Setup do Projeto

- Baixe as planilhas dos atletas de cada delegação em arquivos `.csv` separados e coloque-os dentro da pasta `registrations/`
- Também atualize os arquivos `*.json` indicando os cursos estatutários dentro da seção `regular` e os não-estatutários dentro da seção `exceptional`
- Apague os arquivos das delegações que não vão participar e crie arquivos novos para as delegações estreantes, sempre mantendo os mesmos formatos

### Gerar Credenciais

```
node index.js gen 'registrations/*.json' --output-dir=output --layout=idcard --no-validate=true --log --warn
```

### Validar Cadastro de Atletas (não gera arquivos)

```
node index.js val 'registrations/*.json' --output-dir=output --no-validate=true --log --warn
```

### Gerar Listas de Atletas

```
node index.js csv 'registrations/*.json' --output=output/credentials.csv --no-validate=true --log --warn
```
