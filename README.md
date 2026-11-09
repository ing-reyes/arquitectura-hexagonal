# API Hexagonal — Users & Auth

API REST en **TypeScript + Express** construida sobre la **arquitectura hexagonal** (Ports & Adapters),
con módulos de **usuarios** y **autenticación (JWT)**, persistencia en **MongoDB**,
**autorización por rol (middleware JWT)**, **endurecimiento de seguridad** (helmet, CORS, rate limiting)
y una suite de **67 tests** con Vitest.

---

## Índice

1. [Requisitos previos](#1-requisitos-previos)
2. [Levantar el servidor](#2-levantar-el-servidor)
3. [Variables de entorno](#3-variables-de-entorno)
4. [Scripts disponibles](#4-scripts-disponibles)
5. [La arquitectura hexagonal](#5-la-arquitectura-hexagonal)
6. [Capa `domain` — El núcleo](#6-capa-domain--el-núcleo)
7. [Capa `application` — Casos de uso](#7-capa-application--casos-de-uso)
8. [Capa `infrastructure` — Adaptadores](#8-capa-infrastructure--adaptadores)
9. [Los puertos (Ports)](#9-los-puertos-ports)
10. [`common` — Infraestructura transversal](#10-common--infraestructura-transversal)
11. [Composition Root: `container.ts`](#11-composition-root-containerts)
12. [Bootstrapping: `main.ts`, `server.ts`, `factory.route.ts`](#12-bootstrapping-maints-serverts-factoryroutets)
13. [Estructura del proyecto](#13-estructura-del-proyecto)
14. [Reglas de dependencia](#14-reglas-de-dependencia-las-flechas-siempre-apuntan-hacia-adentro)
15. [Autorización (JWT + roles)](#15-autorización-jwt--roles)
16. [Seguridad](#16-seguridad)
17. [API: endpoints y formatos de respuesta](#17-api-endpoints-y-formatos-de-respuesta)
18. [Tests](#18-tests)
19. [Cambiar la persistencia (Mongo ↔ in-memory)](#19-cambiar-la-persistencia-mongo--in-memory)
20. [Convenciones y roadmap](#20-convenciones-y-roadmap)

---

## 1. Requisitos previos

| Herramienta | Versión mínima | Uso |
|---|---|---|
| **Node.js** | 18+ (recomendado 20+) | Runtime (los tests usan `fetch` global) |
| **npm** | 9+ | Gestor de paquetes |
| **Docker + Docker Compose** | 20+ | MongoDB (persistencia por defecto) |
| **TypeScript** | 5.9 (se instala con el proyecto) | Compilación |

---

## 2. Levantar el servidor

### Paso 1 — Clonar e instalar dependencias

```bash
git clone <repo-url>
cd hexagonal
npm install
```

### Paso 2 — Crear el archivo `.env`

```bash
# Linux / macOS
cp .env.template .env

# Windows (PowerShell)
Copy-Item .env.template .env
```

```env
PORT=3000
JWT_SECRET=tu-llave-secreta-para-jwt

MONGO_USER=hexagonal
MONGO_PASSWORD=secret123
MONGO_URL=mongodb://hexagonal:secret123@localhost:27017
MONGO_DB_NAME=hexagonaldb
```

> Todas las variables son **obligatorias** (`env-var` lanza error si falta alguna),
> incluso las de Mongo, ya que se validan al importar `envs.config`.

### Paso 3 — Levantar MongoDB con Docker

```bash
docker compose up -d
docker compose ps     # debe mostrar "mongo-hexagonal ... running"
```

El contenedor:

- Imagen `mongo:6.0.6`
- Puerto `27017:27017`
- Credenciales tomadas de `${MONGO_USER}` / `${MONGO_PASSWORD}` del `.env`
- Datos persistentes en `./data/mongo` (montado como volumen)

Detenerlo: `docker compose down` (usa `down -v` si además quieres borrar los datos).

> **Importante:** la API arranca conectándose a MongoDB (`await mongodb.connect()` en `main.ts`).
> Si el contenedor no está levantado, el proceso termina con `Failed to start the application`.
> Para trabajar sin base de datos, cambia el adaptador en `container.ts` (ver §19).

### Paso 4 — Arrancar la API

**Modo desarrollo (con recarga automática):**

```bash
npm run dev
```

**Modo producción:**

```bash
npm run build     # compila src/ -> dist/  (rimraf dist && tsc)
npm start         # node dist/main.js
```

Salida esperada:

```
Mongo Connected
Server running on port 3000
```

Verificación rápida:

```bash
# sin token -> 401
curl http://localhost:3000/users

# registrar e iniciar sesión
curl -X POST http://localhost:3000/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada","email":"ada@demo.com","password":"secret123"}'

curl -X POST http://localhost:3000/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@demo.com","password":"secret123"}'
```

---

## 3. Variables de entorno

| Variable | Requerida | Descripción |
|---|---|---|
| `PORT` | ✅ | Puerto HTTP donde escucha Express (`asPortNumber`) |
| `JWT_SECRET` | ✅ | Semilla para firmar/verificar tokens JWT (expiración por defecto: `2h`) |
| `MONGO_USER` | ✅ | Usuario root de MongoDB (usado por docker-compose) |
| `MONGO_PASSWORD` | ✅ | Password root de MongoDB |
| `MONGO_URL` | ✅ | URI de conexión, p. ej. `mongodb://user:pass@localhost:27017` |
| `MONGO_DB_NAME` | ✅ | Nombre de la base de datos |

La lectura ocurre en [`src/common/config/envs.config.ts`](src/common/config/envs.config.ts)
con `dotenv` + `env-var`. **El `.env` está ignorado por git** (ver `.gitignore`).

---

## 4. Scripts disponibles

| Script | Comando | Descripción |
|---|---|---|
| `npm run dev` | `tsnd --respawn --clear src/main.ts` | Servidor en desarrollo con *hot reload* |
| `npm run build` | `rimraf dist && tsc` | Limpia `dist/` y compila TypeScript (sin tests) |
| `npm start` | `node dist/main.js` | Ejecuta la versión compilada |
| `npm test` | `vitest run` | Suite completa (unit + integración) |
| `npm run test:watch` | `vitest` | Tests en modo *watch* |
| `npm run typecheck` | `tsc --noEmit` | Chequeo de tipos del código de producción |
| `npm run typecheck:test` | `tsc --noEmit -p tsconfig.test.json` | Chequeo de tipos **incluyendo** los tests |

---

## 5. La arquitectura hexagonal

También llamada **Ports & Adapters** (Alistair Cockburn). La idea central:

> El **dominio** es el centro de la aplicación y **no conoce** nada del exterior
> (ni Express, ni Mongoose, ni JWT, ni la base de datos). Todo lo externo se conecta
> al núcleo mediante **puertos** (interfaces) y se implementa en **adaptadores**.

```mermaid
flowchart LR
    subgraph ADAPTADORES_ENTRADA["Adaptadores de entrada (Driving)"]
        HTTP["HTTP<br/>routes + controllers<br/>Express + AuthMiddleware"]
    end

    subgraph PUERTOS_IN["Puertos de entrada"]
        PI{{"Use Cases<br/>(invocados por controllers)"}}
    end

    subgraph NUCLEO["NÚCLEO / HEXÁGONO"]
        APP["application<br/>use-cases + dto"]
        DOM["domain<br/>models · value objects · commands · ports"]
    end

    subgraph PUERTOS_OUT["Puertos de salida"]
        PO{{"RepositoryPort<br/>(interfaces)"}}
    end

    subgraph ADAPTADORES_SALIDA["Adaptadores de salida (Driven)"]
        MEM["InMemoryRepository"]
        MONGO["MongoRepository<br/>Mongoose"]
    end

    HTTP --> PI
    PI --> APP
    APP --> DOM
    APP --> PO
    PO --> MEM
    PO --> MONGO
```

En este repositorio esa teoría se materializa en carpetas:

```
src/modules/<modulo>/
├── domain/            ← hexágono (núcleo): modelos, VOs, comandos, PUERTOS
├── application/       ← hexágono: casos de uso y DTOs de la app
└── infrastructure/    ← fuera del hexágono: ADAPTADORES
    └── adapters/
        ├── input/http/{routes,controllers}       ← adaptadores de ENTRADA
        └── output/persistence/{in-memory,mongo}  ← adaptadores de SALIDA
```

| Concepto hexagonal | Aquí es... |
|---|---|
| Hexágono (core) | `domain/` + `application/` |
| Puerto de entrada | Contrato de los *use cases* (`interface UseCase { execute(...) }`) invocado por los controllers |
| Puerto de salida | `domain/ports/output/*.repository.ts` (p. ej. `UserRepositoryPort`) |
| Adaptador de entrada | `infrastructure/adapters/input/http/**` (routes + controllers + `AuthMiddleware`) |
| Adaptador de salida | `infrastructure/adapters/output/persistence/**` (in-memory y mongo) |
| Composition Root | `src/container.ts` |

---

## 6. Capa `domain` — El núcleo

Es el corazón del hexágono. **No importa nada de `infrastructure`, Express, Mongoose ni
librerías externas** (solo contratos de `common/interfaces` como `ApiOneResponse`).

```
domain/
├── models/
│   ├── user.ts                  # Entidad User (compuesta por Value Objects)
│   ├── commands/                # Intención de cambio: Create-Update
│   │   ├── create-user.command.ts
│   │   └── update-user.command.ts
│   └── value-objects/           # Tipos con validación intrínseca
│       ├── user-id.ts · user-email.ts · user-name.ts · user-password.ts
│       ├── user-roles.ts
│       └── user-created-at.ts · user-updated-at.ts · user-last-access.ts
└── ports/
    └── output/
        └── user-repository.port.ts   # ← PUERTO DE SALIDA (interfaz)
```

### Value Objects

Objetos inmutables que **se validan a sí mismos en el constructor** y fallan rápido:

```ts
// src/modules/auth/domain/models/value-objects/auth-password.ts
export class AuthPassword {
    constructor(public readonly value: string) { this.validate(); }

    validate(): void {
        if (this.value.length < 6) {
            throw ManagerError.badRequest('Password must be at least 6 characters long');
        }
    }
}
```

Si el dato es inválido, la validación ocurre **antes** de llegar a la base de datos:
la regla de negocio vive en el dominio, no en el controller ni en el schema de Mongoose.

### Entities y Commands

- `User` y `Auth` agrupan Value Objects y exponen `mapToPrimitive()` para serializar.
- `CreateUserCommand` / `UpdateUserCommand` / `SignInCommand` / `SignUpCommand` transportan
  **Value Objects ya construidos y validados**, nunca `string` crudos.

---

## 7. Capa `application` — Casos de uso

Coordina el flujo: **recibe el DTO de entrada → construye VOs/Commands → invoca un puerto →
transforma la salida en DTO de respuesta**.

```
application/
├── dto/
│   ├── requests/    # CreateUserRequest, UpdateUserRequest (validación + shape)
│   └── responses/   # UserPrimitiveResponse, AuthPrimitiveResponse (serialización)
└── use-cases/
    ├── create-user.use-case.ts      update-user.use-case.ts
    ├── find-one-user.use-case.ts    find-all-user.use-case.ts
    └── remove-one-user.use-case.ts
```

```ts
// src/modules/user/application/use-cases/create-user.use-case.ts
export class CreateUserUseCase implements UseCase {
    constructor(private readonly userRepositoryPort: UserRepositoryPort) {}

    execute(createUserRequest: CreateUserRequest): Promise<boolean> {
        const command = new CreateUserCommand(
            new UserName(createUserRequest.name),      // valida en constructor
            new UserEmail(createUserRequest.email),    // valida en constructor
            new UserPassword(createUserRequest.password),
        );
        return this.userRepositoryPort.create(command);  // ← depende de la INTERFAZ
    }
}
```

**Clave:** el caso de uso **no sabe** si el comando va a MongoDB o a memoria; solo conoce
`UserRepositoryPort`. Esto permite intercambiar adaptadores sin tocar esta capa.

Los DTOs de salida (`UserPrimitiveResponse`, `AuthPrimitiveResponse`) garantizan además que
**la contraseña (ni su hash) nunca salgan de la API**.

---

## 8. Capa `infrastructure` — Adaptadores

```
infrastructure/adapters/
├── input/                             # Adaptadores de ENTRADA (Driving)
│   └── http/
│       ├── routes/                    # verbo+path -> handler (+ AuthMiddleware)
│       └── controllers/               # HTTP <-> aplicación
└── output/                            # Adaptadores de SALIDA (Driven)
    └── persistence/
        ├── in-memory/                 # Repo en memoria + mapper
        └── mongo/                     # Repo Mongoose + schema + mapper
```

- **Routes** (`*.route.ts`) — declaran el contrato HTTP. Cada módulo expone un `Router`
  mediante el *getter* `routes`; `FactoryRoutes` los monta bajo `/users` y `/auth`.
- **Controllers** (`*.controller.ts`) hacen tres cosas y nada más:
  1. Validan la petición (`Dto.validate(req.body)` / `PaginationDto.validate(req.query)`).
  2. Invocan el caso de uso correspondiente.
  3. Traducen resultado/error a HTTP con `Handler`.

> El controller **nunca** toca la base de datos ni conoce los repositorios:
> solo conoce casos de uso. Es el único punto donde aparece `express`.

| Adaptador de salida | Clase | Implementa | Uso |
|---|---|---|---|
| MongoDB (**activo**) | `MongoUserRepository` | `UserRepositoryPort` | Persistencia real vía Mongoose |
| MongoDB (**activo**) | `MongoAuthRepository` | `AuthRepositoryPort` | Login/registro con `bcrypt` |
| In-memory | `InMemoryUserRepository` | `UserRepositoryPort` | Sin BD, pruebas, desarrollo |
| In-memory | `InMemoryAuthRepository` | `AuthRepositoryPort` | Login sobre el repo en memoria |

Cada adaptador incluye un **Mapper** (`toDomain`) que convierte entre el formato del medio
(documento Mongoose, objeto plano) y las entidades del dominio. Los repositorios devuelven
**tipos de dominio**, nunca documentos de Mongoose.

> Nota: el repo in-memory genera ids con formato de 24 hexadecimales
> (`000000000000000000000001`) para ser intercambiable con el adaptador Mongo
> (el controller valida `Validators.isMongoId`).

---

## 9. Los puertos (Ports)

Un puerto es **una interfaz TypeScript declarada en `domain/`** que define *qué* se necesita,
sin decir *cómo* se hace.

```ts
// src/modules/user/domain/ports/output/user-repository.port.ts
export interface UserRepositoryPort {
    create(createUserCommand: CreateUserCommand): Promise<boolean>;
    update(id: UserId, updateUserCommand: UpdateUserCommand): Promise<boolean>;
    findOne(id: UserId): Promise<ApiOneResponse<User | null>>;
    findOneByEmail(email: UserEmail): Promise<ApiOneResponse<User | null>>;
    findAll(pagination: { page: number; limit: number }): Promise<ApiAllResponse<User>>;
    remove(id: UserId): Promise<boolean>;
}
```

```ts
// src/modules/auth/domain/ports/output/auth.repository.ts
export interface AuthRepositoryPort {
    signIn(command: SignInCommand): Promise<ApiOneResponse<Auth>>;
    signUp(command: SignUpCommand): Promise<boolean>;
}
```

- **Puerto de salida (output):** consumido por la aplicación, implementado por adaptadores
  (`*Repository implements *Port`).
- **Puerto de entrada (input):** los contratos `interface UseCase { execute(...) }`
  implementados por los casos de uso e invocados por los adaptadores de entrada.

> La dependencia siempre apunta hacia el núcleo: el puerto vive en `domain/`, y solo la
> infraestructura lo importa para implementarlo.

---

## 10. `common` — Infraestructura transversal

```
src/common/
├── config/
│   ├── envs.config.ts        # Lectura validada de .env (env-var + dotenv)
│   ├── jwt.config.ts         # generateToken / validateToken / renewToken
│   ├── bcrypt.config.ts      # hashPassword / comparePassword
│   └── validators.config.ts  # isEmail / isMongoId
├── databases/mongodb/
│   └── mongo-connect.ts      # MongoDB.connect() con mongoose.connect()
├── dtos/pagination/
│   └── pagination.dto.ts     # PaginationDto.validate(req.query) -> [errors, dto]
├── enums/
│   ├── http-status.enum.ts   # Mapa código HTTP -> número
│   └── user-roles.enum.ts    # Roles.USER · Roles.ADMIN
├── errors/
│   ├── manager.error.ts      # ManagerError + fábricas (badRequest, forbidden, ...)
│   ├── add.error.ts          # Acumulador de errores de validación de DTOs
│   └── handler.error.ts      # Handler: ManagerError|Error -> respuesta JSON
├── interfaces/
│   ├── api-response.interface.ts  # ApiOneResponse<T> / ApiAllResponse<T>
│   ├── jwt-payload.interface.ts   # { sub, email, roles } + augmentación de `req.user`
│   ├── status.interface.ts        # { statusCode, statusMsg, error }
│   └── metadata.interface.ts      # { total, page, lastPage, limit }
└── middlewares/
    └── auth.middleware.ts    # Validación Bearer + roles (ver §15)
```

**Manejo de errores:** los Value Objects y casos de uso lanzan `ManagerError`
(`ManagerError.badRequest('...')`, `ManagerError.forbiden('...')`, …) y el `Handler`
del controller lo traduce a HTTP:

```json
{ "statusCode": 400, "statusMsg": "BAD_REQUEST", "errors": ["Password must be at least 6 characters long"] }
```

Cualquier `Error` no controlado responde `500 INTERNAL_SERVER_ERROR`.

---

## 11. Composition Root: `container.ts`

[`src/container.ts`](src/container.ts) es el **único lugar donde se conoce la implementación
concreta**. Aquí se instancia todo y se inyectan las dependencias (**constructor injection**,
sin frameworks de DI):

```ts
const bcryptConfig = new BcryptConfig();
const jwtConfig = new JwtConfig();
export const handlerError = new Handler();
const authMiddleware = new AuthMiddleware(jwtConfig, handlerError);

//* Adaptador de salida activo (MongoDB)
export const userRepository = new MongoUserRepository(UserModel, new MongoUserMapper(), bcryptConfig);

//* Casos de uso (reciben el PUERTO, no la clase concreta)
const createUserUseCase = new CreateUserUseCase(userRepository);
// ...

//* Adaptadores de entrada
export const userRoutes = new UserRoutes(userController, authMiddleware);
const authRepository = new MongoAuthRepository(userRepository, new MongoAuthMapper(), bcryptConfig);
export const authRoutes = new AuthRoutes(authController);

//* Composición del servidor
export const factoryRoutes = new FactoryRoutes(userRoutes, authRoutes);
export const server        = new AppServer(factoryRoutes);
export const mongodb       = new MongoDB({ mongoUrl: envs.MONGO_URL, dbName: envs.MONGO_DB_NAME });
```

Para cambiar la persistencia **basta con cambiar estas líneas**: ninguna otra capa se entera.

---

## 12. Bootstrapping: `main.ts`, `server.ts`, `factory.route.ts`

| Archivo | Responsabilidad |
|---|---|
| [`src/main.ts`](src/main.ts) | Punto de entrada: **conecta MongoDB** y arranca `server.start(envs.PORT)`. Si algo falla → `process.exit(1)`. |
| [`src/server.ts`](src/server.ts) | `AppServer`: aplica los middlewares de seguridad, monta rutas globales y hace `listen(port)` (devuelve el `http.Server`). |
| [`src/factory.route.ts`](src/factory.route.ts) | `FactoryRoutes`: agrupa los routers de cada módulo → `/users`, `/auth`. |
| [`src/container.ts`](src/container.ts) | Composition Root (ver §11). |

Flujo de arranque:

```
npm run dev
   └─> main.ts
         ├─> container.ts              (construye toda la gráfica de objetos)
         ├─> mongodb.connect()         -> "Mongo Connected"
         └─> server.start(PORT)
               ├─> helmet + cors + rate limit + body parsers
               ├─> app.use(FactoryRoutes.routes)
               │      ├─> /users -> UserRoutes -> AuthMiddleware -> UserController -> UseCases -> RepositoryPort
               │      └─> /auth  -> AuthRoutes (rate limit propio) -> AuthController -> UseCases -> AuthRepositoryPort
               └─> app.listen(PORT) -> "Server running on port 3000"
```

---

## 13. Estructura del proyecto

```
hexagonal/
├── .env                    # Config local (NO commitear)
├── .env.template           # Plantilla de variables de entorno
├── docker-compose.yml      # MongoDB 6.0.6 en puerto 27017
├── package.json            # Scripts: dev / build / start / test / typecheck
├── tsconfig.json           # strict: true; src -> dist (excluye tests)
├── tsconfig.test.json      # Extensión para typecheck de tests
├── vitest.config.mts       # Configuración de Vitest (incluye env de prueba)
├── data/mongo/             # Volumen de datos de MongoDB (ignorado por git)
├── dist/                   # Build compilado (ignorado por git)
└── src/
    ├── main.ts             # Bootstrap
    ├── server.ts           # AppServer (Express + seguridad)
    ├── factory.route.ts    # Agrupación de rutas
    ├── container.ts        # Composition Root (inyección de dependencias)
    ├── common/             # Soporte transversal (§10)
    ├── tests/
    │   └── http.integration.test.ts   # Suite HTTP end-to-end
    └── modules/
        ├── user/
        │   ├── domain/            # modelos, VOs, commands, ports
        │   ├── application/       # use-cases, dto  (+ *.test.ts)
        │   └── infrastructure/    # adapters input/http + output/persistence
        └── auth/
            ├── domain/           # Auth, SignIn/SignUpCommand, AuthRepositoryPort
            ├── application/      # signIn/signUp use-cases, dtos (+ *.test.ts)
            └── infrastructure/   # auth controller/routes + in-memory/mongo repos
```

---

## 14. Reglas de dependencia (las flechas siempre apuntan hacia adentro)

```
infrastructure  ──implements──▶  ports (domain)  ◀──consumes──  application  ──▶  domain
      ▲                                                                    │
      └───────────────────  (solo container.ts sabe quién es quién)  ◀──────┘
```

1. `domain` **no importa** nada de `application`, `infrastructure` ni librerías externas.
2. `application` importa `domain` (entidades, VOs, commands y **puertos**), nunca adaptadores.
3. `infrastructure` importa `domain` (para implementar puertos) y, vía controller, `application`.
4. Solo `container.ts` conoce **simultáneamente** adaptadores y casos de uso.
5. Si algo debe cruzar capas se hace mediante contratos en `common/interfaces`.

Esto permite cambiar Express por Fastify, o Mongo por PostgreSQL, **sin reescribir el dominio
ni los casos de uso**.

---

## 15. Autorización (JWT + roles)

### Middleware

`AuthMiddleware` ([`src/common/middlewares/auth.middleware.ts`](src/common/middlewares/auth.middleware.ts))
exige un header `Authorization: Bearer <token>`, lo verifica con `JwtConfig.validateToken`
y, opcionalmente, valida roles:

| Situación | Respuesta |
|---|---|
| Sin header o esquema distinto de `Bearer` | `401 UNAUTHORIZED` |
| Token inválido, expirado o con payload incompleto | `401 UNAUTHORIZED` |
| Token válido pero sin el rol requerido | `403 FORBIDDEN` |
| Token válido y rol permitido | ✅ `next()` y `req.user = payload` |

El payload decodificado queda disponible como `req.user`. El tipado vive en
[`jwt-payload.interface.ts`](src/common/interfaces/jwt-payload.interface.ts)
(`declare global` + `namespace Express`), **no** en un `.d.ts` suelto: `ts-node-dev`
solo compila la cadena de imports y se saltaría los archivos ambientales aislados.

```json
{ "sub": "65f1...", "email": "ada@demo.com", "roles": ["USER"] }
```

### Mapa de acceso

| Método | Ruta | Acceso |
|---|---|---|
| `POST` | `/auth/sign-up` | 🌐 Público |
| `POST` | `/auth/sign-in` | 🌐 Público (+ rate limit estricto) |
| `POST` | `/users` | 🌐 Público |
| `GET` | `/users` | 🔒 **`ADMIN`** |
| `GET` | `/users/:id` | 🔒 Cualquier token |
| `PATCH` | `/users/:id` | 🔒 Cualquier token |
| `DELETE` | `/users/:id` | 🔒 Cualquier token |

Aplicación en [`user.route.ts`](src/modules/user/infrastructure/adapters/input/http/routes/user.route.ts):

```ts
router.post("/",  this.userController.create);                                   // público
router.get("/",   this.authMiddleware.validate([Roles.ADMIN]), this.userController.findAll);
router.get("/:id", this.authMiddleware.validate(), this.userController.findOne);
```

> ⚠️ **Pendiente:** hoy el adaptador Mongo asigna `["USER"]` por defecto y no existe un
 *seed* de administradores, por lo que el listado `GET /users` requiere crear un `ADMIN`
 directamente en la base de datos. Ver roadmap (§20).

---

## 16. Seguridad

Configurados en [`src/server.ts`](src/server.ts) y en las rutas:

| Medida | Dónde | Detalle |
|---|---|---|
| **helmet** | global | Cabeceras HTTP seguras (X-Frame, HSTS, CSP, etc.) |
| **CORS** | global | `cors()` habilitado (restringible) |
| **Rate limit global** | global | 300 peticiones / 15 min por IP → `429` |
| **Rate limit de auth** | `/auth/**` | **10 intentos / 15 min** por IP → `429` |
| **Tamaño de body** | global | `express.json({ limit: "100kb" })` |
| **Hash de contraseñas** | repositorio | `bcryptjs` (`$2b$10$...`) al crear/actualizar |
| **JWT** | `JwtConfig` | Firma HS256 con `JWT_SECRET`, expiración `2h` |
| **Sin filtrado de credenciales** | DTO de salida | `UserPrimitiveResponse` no incluye `password` |

---

## 17. API: endpoints y formatos de respuesta

Base URL: `http://localhost:{{PORT}}`

### Users — `/users`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `POST` | `/users` | 🌐 | Crea un usuario |
| `GET` | `/users?page&limit` | 🔒 ADMIN | Lista usuarios paginados |
| `GET` | `/users/:id` | 🔒 token | Obtiene un usuario por id |
| `PATCH` | `/users/:id` | 🔒 token | Actualiza `name`, `email` y/o `password` |
| `DELETE` | `/users/:id` | 🔒 token | Elimina un usuario |

### Auth — `/auth`

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/auth/sign-up` | Registra (`name`, `email`, `password`) → `201` |
| `POST` | `/auth/sign-in` | Devuelve `{ user, token }` con JWT de 2h → `200` |

### Ejemplos

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@demo.com","password":"secret123"}' | jq -r '.data.token')

# Listado (requiere rol ADMIN)
curl "http://localhost:3000/users?page=1&limit=5" -H "Authorization: Bearer $TOKEN"

# Detalle / actualización / borrado
curl http://localhost:3000/users/<id> -H "Authorization: Bearer $TOKEN"
curl -X PATCH http://localhost:3000/users/<id> -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"name":"Ada L."}'
curl -X DELETE http://localhost:3000/users/<id> -H "Authorization: Bearer $TOKEN"
```

### Formatos de respuesta

**Recurso único** (`ApiOneResponse<T>`):

```json
{
  "status": { "statusCode": 200, "statusMsg": "OK", "error": null },
  "data": {
    "id": "65f12fa9f455d67036929e2d",
    "name": "Ada",
    "email": "ada@demo.com",
    "roles": ["USER"],
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z",
    "lastAccess": "2026-01-01T00:00:00.000Z"
  }
}
```

> La contraseña **nunca** aparece en la respuesta (ni hasheada).

**Colección** (`ApiAllResponse<T>`):

```json
{
  "meta": { "total": 3, "page": 1, "lastPage": 1, "limit": 10 },
  "status": { "statusCode": 200, "statusMsg": "OK", "error": null },
  "data": [ { "...": "..." } ]
}
```

**Sign-in:**

```json
{
  "status": { "statusCode": 200, "statusMsg": "OK", "error": null },
  "data": {
    "user": { "id": "65f1...", "name": "Ada", "email": "ada@demo.com", "roles": ["USER"] },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Errores:**

```json
{ "statusCode": 400, "statusMsg": "BAD_REQUEST", "errors": ["Email is required"] }
{ "statusCode": 401, "statusMsg": "UNAUTHORIZED", "errors": ["Authorization header must be in the format: Bearer <token>"] }
{ "statusCode": 403, "statusMsg": "FORBIDDEN", "errors": ["Requires one of these roles: ADMIN"] }
{ "statusCode": 429, "statusMsg": "TOO_MANY_REQUESTS", "errors": ["Too many authentication attempts, try again later"] }
```

| Código | Cuándo |
|---|---|
| `200 OK` | Lecturas y actualizaciones exitosas |
| `201 CREATED` | `POST /users` y `POST /auth/sign-up` |
| `400 BAD_REQUEST` | DTO inválido, id que no es MongoID, credenciales incorrectas, VOs inválidos |
| `401 UNAUTHORIZED` | Ausencia/esquema incorrecto de token, token inválido |
| `403 FORBIDDEN` | Token válido sin el rol requerido |
| `404 NOT_FOUND` | Recurso inexistente |
| `429 TOO_MANY_REQUESTS` | Rate limit superado |
| `500 INTERNAL_SERVER_ERROR` | Error no controlado |

---

## 18. Tests

**Framework:** [Vitest](https://vitest.dev) (`vitest.config.mts`).

```bash
npm test              # ejecución única
npm run test:watch    # modo watch
npm run typecheck:test  # tsc sobre los tests
```

| Archivo | Cubre |
|---|---|
| `modules/user/domain/.../value-objects.test.ts` | Validación de `UserName`, `UserEmail`, `UserPassword`, `UserId`, `UserRoles` |
| `modules/auth/domain/.../value-objects.test.ts` | Validación de `AuthEmail`, `AuthPassword`, `AuthName`, `AuthId`, `AuthRoles` |
| `modules/user/application/use-cases/use-cases.test.ts` | Los 5 casos de uso de usuarios contra un repositorio *stub* (puerto) |
| `modules/auth/application/use-cases/auth-use-cases.test.ts` | `signUp`/`signIn`, JWT, credenciales inválidas |
| `modules/user/infrastructure/.../in-memory-user.repository.test.ts` | CRUD, paginación y `findOneByEmail` del adaptador en memoria |
| `common/middlewares/auth.middleware.test.ts` | 401/403, esquema Bearer, roles, `req.user` |
| `tests/http.integration.test.ts` | **End-to-end HTTP**: boot del `AppServer`, rutas, auth, paginación, rate limit |

La suite corre **sin base de datos**: la integración levanta el servidor real en un puerto
efímero (`listen(0)`) sobre el adaptador in-memory y lo consume con `fetch`.

```
 Test Files  7 passed (7)
      Tests  67 passed (67)
```

---

## 19. Cambiar la persistencia (Mongo ↔ in-memory)

La promesa de la arquitectura: **cambiar la persistencia no toca ni el dominio ni los casos de uso.**

### Mongo → in-memory (sin Docker)

En [`src/container.ts`](src/container.ts):

```ts
//* Antes (activo)
export const userRepository = new MongoUserRepository(UserModel, new MongoUserMapper(), bcryptConfig);
const authRepository = new MongoAuthRepository(userRepository, new MongoAuthMapper(), bcryptConfig);

//* Después (in-memory)
import { InMemoryUserRepository } from "./modules/user/infrastructure/adapters/output/persistence/in-memory/in-memory-user.repository";
import { InMemoryUserMapper } from "./modules/user/infrastructure/adapters/output/persistence/in-memory/in-memory-user.mapper";

export const userRepository = new InMemoryUserRepository(new InMemoryUserMapper());
const authRepository = new InMemoryAuthRepository(userRepository, new InMemoryAuthMapper());
```

Y en [`src/main.ts`](src/main.ts) comenta `await mongodb.connect();`.

`InMemoryUserRepository` acepta además un segundo argumento opcional para resolver roles
(útil para tests o seeds):

```ts
new InMemoryUserRepository(new InMemoryUserMapper(),
    (email) => email.value.startsWith("admin@") ? [Roles.ADMIN] : [Roles.USER]);
```

### in-memory → Mongo (activo por defecto)

Es el estado actual del repositorio: solo requiere
`docker compose up -d` y el `mongodb.connect()` de `main.ts`.

El mismo razonamiento aplica a `auth`: basta con implementar `AuthRepositoryPort`
con cualquier medio (ya existen `MongoAuthRepository` e `InMemoryAuthRepository`).

---

## 20. Convenciones y roadmap

### Convenciones del repo

- **Naming:** `*.use-case.ts`, `*.repository.ts` (puerto: `*.port.ts`), `*.controller.ts`,
  `*.route.ts`, `*.mapper.ts`, `*.dto.ts`, `*.command.ts`, VOs en kebab-case.
- **Inyección por constructor** sin framework de DI; la composición vive solo en `container.ts`.
- **Validación en dos anillos:** forma en los DTOs (`XxxRequest.validate`) y reglas de negocio
  en los Value Objects (constructor con `throw ManagerError`).
- **Errores** siempre con las fábricas de `ManagerError` para que `Handler` los serialice.
- **DTOs de salida primitivos** en lugar de entidades de dominio crudas.
- **`tsconfig.json` en `strict: true`** con `noUncheckedIndexedAccess` y
  `exactOptionalPropertyTypes`; los tests se excluyen del build (`tsconfig.test.json` los incluye).
- **Seguridad:** `.env` fuera de git, `bcrypt` para hashes, JWT HS256 de 2h, helmet/CORS/rate limit.
- **Git ignora:** `node_modules`, `dist`, `data/`, `.env`.

### Roadmap

**Completado**

- [x] **Middleware de autorización** con `JwtConfig.validateToken` y control de `Roles`
      (`common/middlewares/auth.middleware.ts`, montado en `UserRoutes`).
- [x] **`MongoAuthRepository`** + `findOneByEmail` en `UserRepositoryPort` +
      **conexión a MongoDB habilitada por defecto** (`main.ts`).
- [x] **Suite de tests con Vitest**: 67 tests (dominio, casos de uso, adaptadores,
      middleware e integración HTTP).
- [x] **Seguridad**: helmet, CORS, rate limiting global (300/15 min) y estricto en
      `/auth` (10/15 min), body limit de 100kb.
- [x] **Correcciones detectadas al testear**: `remove`/`findAll` del repo in-memory,
      `mapToPrimitive` desactualizado tras un `update`, tipo de `Auth.id`, y
      **filtrado del hash de contraseña** en las respuestas.
- [x] **Augmentación de `req.user`** movida a `jwt-payload.interface.ts` (módulo importado)
      porque `ts-node-dev` no compila `.d.ts` ambientales sueltos.

**Pendiente**

- [ ] **Seed / creación de usuarios `ADMIN`** (hoy `GET /users` exige un rol que no se
      puede asignar por API).
- [ ] Rate limiting configurable por variable de entorno.
- [ ] Middleware de auditoría/`lastAccess` real en cada request autenticado.
- [ ] CI con `typecheck` + `test` en cada PR.
- [ ] Rate limit y CORS configurables por entorno (producción/development).

---

## Licencia

ISC
