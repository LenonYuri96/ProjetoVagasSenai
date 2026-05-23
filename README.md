# 💼 ProjetoVagasSenai

**Plataforma de gerenciamento de anúncios de vagas e marketing institucional para o SENAI**

🔗 **Link:** [ProjetoVagasSenai no GitHub](https://github.com/LYuri26/ProjetoVagasSenai)

---

## **📖 Sobre o Projeto**

Sistema completo para gestão de comunicação institucional do SENAI, permitindo:

### **🎯 Principais Funcionalidades**

- 📌 Publicação de vagas de emprego (imagens, vídeos e descrições)
- 📅 Agendamento de postagens
- 📊 Painel de métricas (visualizações, engajamento)
- 👨‍💼 Área administrativa para gestores
- 📱 Design responsivo (acesso em dispositivos móveis)

## Estrutura do Projeto

A estrutura de pastas e arquivos é a seguinte:

```markdown
.
├── README.md
├── admin
│ ├── config.json
│ ├── css
│ │ └── indexadmin.css
│ ├── images
│ │ └── senai-logo-0.png
│ ├── js
│ │ ├── indexadmin.js
│ │ └── upload.js
│ ├── php
│ │ ├── delete_item.php
│ │ ├── list_uploads.php
│ │ ├── update_time.php
│ │ └── upload.php
│ └── uploads
│ ├── photos
│ └── videos
├── user
│ ├── css
│ │ └── indexuser.css
│ ├── js
│ │ └── indexuser.js
│ └── indexuser.html
└── index.html
```

## Funcionalidades

1. **Upload de Mídia**: O administrador pode fazer upload de imagens e vídeos através da interface de administração.
2. **Configuração de Tempo de Exibição**: O tempo de exibição das mídias pode ser alterado diretamente pela interface do administrador, e essa configuração será salva em um arquivo `config.json`.
3. **Exibição de Mídia**: Os usuários acessam a interface que alterna entre as mídias (imagens e vídeos), exibindo-os por um período de tempo determinado no JSON.

## Tecnologias Utilizadas

- **Frontend**:

  - **HTML**: Para a estrutura das páginas de administração e exibição de mídia.
  - **CSS**: Para estilização básica das páginas.
  - **JavaScript**: Para controle de exibição da mídia de acordo com o tempo definido.

- **Backend**:
  - **PHP**: Para o upload de arquivos, leitura e escrita do arquivo JSON, e manipulação do conteúdo exibido.
  - **JSON**: Armazenamento das configurações, como o tempo de exibição.

## Como Usar

### 1. Clonar o Repositório

Clone o projeto em sua máquina local:

```bash
git clone https://github.com/LYuri26/ProjetoVagasSenai.git
cd projeto
```

### 2. Configurar o Servidor Web

Este projeto depende de um servidor web que execute PHP (como **Apache** ou **Nginx**) e tenha suporte para arquivos PHP e leitura de arquivos JSON.

- Coloque a pasta `projeto` no diretório raiz do seu servidor web.
- Certifique-se de que o servidor web tenha permissões para gravar no diretório `/uploads` e no arquivo `config.json`.

### 3. Acessar a Interface

- **Administrador**: Acesse a interface de administração via `http://seu-ip/admin/`. Aqui, você pode fazer o upload de imagens e vídeos e definir o tempo de exibição.
- **Usuário**: Acesse a interface de exibição de mídia via `http://seu-ip/user/`. A mídia será alternada automaticamente com base no tempo configurado.

### 4. Modificar Tempo de Exibição

Na interface de **administração**, você pode alterar o tempo de exibição das mídias. Isso será salvo no arquivo `config.json`, e a alteração será refletida automaticamente na interface do usuário.

## Requisitos

- **PHP** (versão 7.0 ou superior)
- **Servidor Web** como Apache ou Nginx
- **Raspberry Pi** com acesso à rede para distribuir as páginas

## Segurança

Como não há autenticação implementada, qualquer pessoa com acesso ao endereço IP do Raspberry Pi pode modificar as configurações. Se for necessário, você pode adicionar um simples mecanismo de autenticação com senha ou proteger o acesso ao painel administrativo de outra forma.

## Contribuição

Se você quiser contribuir para este projeto, sinta-se à vontade para enviar um pull request ou abrir uma issue.

## **👨‍🏫 Autor**

**Lenon Yuri (LYuri26)**  
📌 _Professor de Desenvolvimento de Sistemas_

### **🎓 Formações:**

- **Técnico em Informática** – Professor Guerino Casassanta
- **Bacharel em Sistemas de Informação** – Estácio de Sá
- **Bacharel em Administração** – IFMG
- **Licenciado em Computação** – IFTM

### **📅 Status do Projeto**

🔄 Última atualização: **30 de maio de 2024**
