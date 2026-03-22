# URL Shortener API

API REST para acortar URLs, redireccionar enlaces y medir uso en tiempo real.

![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-black?logo=express)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Deploy-2496ED?logo=docker&logoColor=white)
![Traefik](https://img.shields.io/badge/Traefik-Reverse_Proxy-24A1C1?logo=traefikproxy&logoColor=white)

## Resumen ejecutivo

Este proyecto demuestra competencias clave de backend orientadas a producto:

- Diseño y exposicion de API REST con Express y TypeScript estricto.
- Persistencia robusta con Prisma + PostgreSQL y migraciones versionadas.
- Instrumentacion basica de analitica (clicks + access logs).
- Enfoque de despliegue con contenedores Docker y Traefik como reverse proxy.

## Funcionalidades principales

- Creacion de links cortos desde URLs originales.
- Redireccion HTTP 302 usando codigo corto.
- Contador de clicks por enlace.
- Registro de acceso con IP y User-Agent.
- Consulta de enlaces con metricas agregadas.
- Eliminacion de enlaces por short code.

## Stack tecnico

| Capa           | Tecnologia                  | Uso en el proyecto                  |
| -------------- | --------------------------- | ----------------------------------- |
| Lenguaje       | TypeScript                  | Seguridad de tipos y mantenibilidad |
| Runtime        | Node.js                     | Ejecucion del servicio              |
| Framework HTTP | Express 5                   | Ruteo y manejo de requests          |
| ORM            | Prisma + @prisma/adapter-pg | Acceso tipado a datos               |
| Base de datos  | PostgreSQL 15               | Persistencia relacional             |
| Contenedores   | Docker                      | Entornos reproducibles              |
| Reverse proxy  | Traefik                     | Enrutamiento en despliegue          |
| Calidad        | ESLint + typescript-eslint  | Estandar de codigo                  |
| Documentacion  | Scalar (@scalar/express-api-reference) | UI interactiva para la API |

## Arquitectura

Los diagramas completos están en [`docs/`](./docs/).

### Nivel 1 — System Context

```mermaid
C4Context
    title System Context — URL Shortener

    Person(user, "Usuario", "Cualquier cliente que consume la API via HTTP")

    System(urlShortener, "URL Shortener API", "Acorta URLs, redirige tráfico y registra métricas de uso")

    System_Ext(browser, "Navegador / Cliente HTTP", "Hace requests REST o sigue redirecciones 302")
    System_Ext(postgres, "PostgreSQL", "Base de datos relacional externa gestionada por Docker")

    Rel(browser, urlShortener, "Envía requests HTTP", "REST / HTTP 302")
    Rel(urlShortener, postgres, "Lee y escribe datos", "TCP / Prisma Client")
    Rel(user, browser, "Usa")
```

### Nivel 2 — Container

```mermaid
C4Container
    title Container Diagram — URL Shortener

    Person(user, "Usuario", "Cliente que consume la API")

    System_Boundary(sys, "URL Shortener") {
        Container(traefik, "Traefik", "Reverse Proxy", "Punto de entrada HTTP/HTTPS. Enruta tráfico al contenedor API")
        Container(api, "Express API", "Node.js + TypeScript", "Maneja rutas REST: acortar URLs, redirigir, listar y eliminar links")
        Container(prisma, "Prisma Client", "ORM (TypeScript)", "Abstrae el acceso a PostgreSQL con tipado fuerte y migraciones")
        ContainerDb(db, "PostgreSQL 15", "Base de datos relacional", "Persiste links (short_code, original_url, clicks) y access_logs")
    }

    Rel(user, traefik, "Envía request HTTP/HTTPS", "REST")
    Rel(traefik, api, "Enruta el tráfico", "HTTP")
    Rel(api, prisma, "Consulta y escribe datos", "TypeScript API")
    Rel(prisma, db, "Ejecuta queries", "TCP / SQL")
```

### Nivel 3 — Component

```mermaid
C4Component
    title Component Diagram — Express API

    Container_Boundary(api, "Express API (src/)") {
        Component(index, "index.ts", "Entry point", "Inicializa el servidor Express y escucha en el puerto configurado")
        Component(app, "app.ts", "Router / Controller", "Define y maneja todas las rutas HTTP de la API")
        Component(openapi, "openapi.ts", "OpenAPI Spec", "Genera la especificación OpenAPI 3.0 de la API")
        Component(scalar, "Scalar UI (/docs)", "API Reference", "Sirve la documentación interactiva de la API")
        Component(prismaLib, "lib/prisma.ts", "DB Client", "Instancia singleton del Prisma Client con adapter PostgreSQL")
        Component(types, "types/links.ts", "Types", "Define los tipos TypeScript de respuesta para los endpoints de links")
    }

    ContainerDb(db, "PostgreSQL 15", "Base de datos", "Tablas: links, access_logs")

    Rel(index, app, "Importa y monta")
    Rel(app, prismaLib, "Usa para todas las operaciones de datos")
    Rel(app, openapi, "Obtiene spec para Scalar")
    Rel(app, scalar, "Sirve en /docs")
    Rel(app, types, "Usa para formatear respuestas")
    Rel(prismaLib, db, "Conecta via TCP")
```

## Estructura del proyecto

```text
src/
  index.ts            # Entrada principal y rutas
  lib/
    prisma.ts         # Cliente Prisma con adapter PostgreSQL
  types/
    links.ts          # Tipos de respuestas de links
  generated/prisma/   # Cliente Prisma generado

prisma/
  schema.prisma       # Modelo de datos
  migrations/         # Historial de migraciones
```

## Modelo de datos (Prisma)

### Tabla links

| Campo        | Tipo     | Detalle             |
| ------------ | -------- | ------------------- |
| id           | String   | PK con cuid()       |
| short_code   | String   | Unico               |
| original_url | String   | URL destino         |
| clicks       | Int      | Contador de accesos |
| created_at   | DateTime | Fecha de creacion   |

### Tabla access_logs

| Campo       | Tipo     | Detalle             |
| ----------- | -------- | ------------------- |
| id          | Int      | PK autoincremental  |
| ip_address  | String   | IP del request      |
| user_agent  | String   | Cliente que accedio |
| accessed_at | DateTime | Timestamp de acceso |
| link_id     | String   | FK hacia links.id   |

## API endpoints

| Metodo | Ruta                   | Descripcion            | Respuesta esperada |
| ------ | ---------------------- | ---------------------- | ------------------ |
| GET    | /                      | Home informativa       | 200                |
| POST   | /api/shorten           | Crea short URL         | 200 / 400 / 500    |
| GET    | /:id                   | Redireccion y tracking | 302 / 404 / 500    |
| GET    | /api/links             | Lista links + clicks   | 200 / 500          |
| DELETE | /api/links/:short_code | Elimina link           | 204 / 404 / 500    |
| GET    | /health                | Health check simple    | 200                |
| GET    | /docs                  | Documentacion Scalar   | 200                |

Ejemplo de creacion:

```json
{
  "url": "https://github.com/jonadev19"
}
```

Respuesta:

```json
{
  "short_url": "http://localhost:3000/abc123",
  "original_url": "https://github.com/jonadev19"
}
```

## Variables de entorno

Crear .env basado en .env.example:

```env
DATABASE_URL="postgresql://myuser:shortener_url_api@localhost:5432/shortener_db"
DOMAIN_NAME="http://localhost:3000"
```

## Ejecucion local

1. Instalar dependencias.

```bash
pnpm install
```

2. Levantar PostgreSQL con Docker.

```bash
docker compose -f docker-compose.dev.yml up -d
```

3. Crear y configurar .env.

```bash
cp .env.example .env
```

4. Aplicar migraciones.

```bash
pnpm prisma migrate dev
```

5. Levantar API en modo desarrollo.

```bash
pnpm dev
```

URL local: http://localhost:3000

## Despliegue (Docker + Traefik)

- API empaquetada en contenedores Docker.
- Traefik como punto de entrada para enrutamiento HTTP/HTTPS.
- PostgreSQL como servicio separado para persistencia.
- Arquitectura preparada para separar trafico, aplicacion y datos.

Nota: este repositorio incluye docker-compose para base de datos en local y el enfoque de despliegue productivo se realiza con Docker + Traefik.

## Scripts disponibles

- pnpm dev: desarrollo con recarga
- pnpm build: compilacion a dist/
- pnpm start: ejecucion de build
- pnpm lint: analisis estatico
- pnpm lint:fix: correccion automatica

## Pruebas manuales

El archivo api.rest contiene requests listas para validar:

- Crear URL corta
- Obtener home
- Listar links
- Eliminar link

Compatible con VS Code REST Client, Insomnia y Postman.

## Decisiones tecnicas

- Prisma para tipado fuerte y control de migraciones.
- Logging de acceso separado en access_logs para analitica.
- Separacion del cliente DB en src/lib/prisma.ts.
- API simple y extensible para evolucionar a features de negocio.

## Autor

Proyecto desarrollado por Aaron como muestra de habilidades backend orientadas a producto.
