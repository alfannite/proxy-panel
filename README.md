<div align="center">
  <img src="https://img.icons8.com/color/120/000000/network.png" alt="ProxyPanel Logo" />
  <h1>🌐 ProxyPanel</h1>
  <p><strong>A Modern, Dynamic Reverse Proxy Management Dashboard</strong></p>
  <p>Built with Next.js, Traefik, and Cloudflare integration for seamless reverse proxy routing.</p>

  <div>
    <img src="https://img.shields.io/badge/Next.js-15.0-black?logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/Traefik-Dynamic-blue?logo=traefikproxy" alt="Traefik" />
    <img src="https://img.shields.io/badge/Cloudflare-DNS_API-orange?logo=cloudflare" alt="Cloudflare" />
    <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker" alt="Docker" />
    <img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript" alt="TypeScript" />
  </div>
</div>

<hr />

## ✨ Features

- **🎨 Modern & Responsive Dashboard:** A sleek, user-friendly UI built with Next.js and TailwindCSS.
- **🔄 Dynamic Traefik Configuration:** Manages reverse proxy routing seamlessly by modifying Traefik configuration files on the fly. No manual restarts required!
- **☁️ Cloudflare API Integration:** Automatically fetches zones, resolves IP addresses, and sets up DNS records to keep your domains healthy.
- **🔒 Secure Authentication:** Protected admin routes with a one-time setup mechanism for the master password.
- **🐳 Docker Native:** Deploys easily with `docker-compose`, interacting directly with the Docker daemon via socket for advanced container management.
- **⚡ Service State Management:** Visually monitor your targets, view connected backend IPs, and instantly sync or restart the underlying router.

## 🚀 Quick Start

### 1. Prerequisites
Ensure you have the following installed on your host server:
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### 2. Installation
Clone the repository and deploy the stack:

```bash
git clone https://github.com/alfannite/proxy-panel.git
cd proxy-panel

# Build and run the containers in detached mode
docker compose up -d --build
```

### 3. Initial Setup
Once the containers are running:
1. Navigate to `http://<your-server-ip>:3000` in your web browser.
2. You will be redirected to `/setup-admin` to create your initial master password.
3. Login via `/masukpanel` and start managing your proxies!

## ⚙️ How It Works

**ProxyPanel** mounts the Traefik rules directory (`/opt/proxy/traefik-core/rules/http`) and the Docker socket (`/var/run/docker.sock`) into its container.
When you create a new proxy rule through the dashboard:
1. A valid Traefik YAML configuration file is generated.
2. The file is saved directly to the mounted directory.
3. Traefik's dynamic file provider automatically detects the change and applies the routing instantly.

## 📦 Stack Overview

| Technology      | Purpose                                                       |
| --------------- | ------------------------------------------------------------- |
| **Next.js 15**  | Frontend application framework and API routes                 |
| **React**       | UI component building                                         |
| **TailwindCSS** | Utility-first CSS framework for beautiful, rapid styling      |
| **Prisma**      | ORM for managing local database configurations and settings   |
| **Traefik**     | Underlying Edge Router handling actual reverse proxy traffic  |

## 🛠 Configuration (Environment Variables)

In the `docker-compose.yml`, you can customize the application behavior:

```yaml
environment:
  - NODE_ENV=production
  - JWT_SECRET=super_secret_jwt_key_12345_change_this # Replace with a strong secret
  - DATABASE_URL=file:/app/prisma/dev.db
```

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! 
Feel free to check [issues page](https://github.com/alfannite/proxy-panel/issues).

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
