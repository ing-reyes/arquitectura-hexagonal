# API Hexagonal — Users & Auth

API REST en **TypeScript + Express** construida sobre la **arquitectura hexagonal** (Ports & Adapters),
con módulos de **usuarios** y **autenticación (JWT)**, persistencia intercambiable
(in-memory / MongoDB) y validación, paginación y manejo de errores centralizados.

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
14. [Reglas de dependencia (las flechas siempre apuntan hacia adentro)](#14-reglas-de-dependencia-las-flechas-siempre-apuntan-hacia-adentro)
15. [API: endpoints y formatos de respuesta](#15-api-endpoints-y-formatos-de-respuesta)
16. [Cambiando de adaptador (in-memory ↔ MongoDB)](#16-cambiando-de-adaptador-in-memory--mongodb)
17. [Convenciones y buenas prácticas del repo](#17-convenciones-y-buenas-prácticas-del-repo)

---

## 1. Requisitos previos

| Herramienta | Versión mínima | Uso |
|---|---|---|
| **Node.js** | 18+ (recomendado 20+) | Runtime |
| **npm** | 9+ | Gestor de paquetes |
| **Docker + Docker Compose** | 20+ | Solo si quieres levantar MongoDB |
| **TypeScript** | 5.9 (se instala con el proyecto) | Compilación |

> La API puede levantarse **sin Docker ni MongoDB**: por defecto trabaja con los repositorios
> *in-memory*. Docker es necesario únicamente para usar el adaptador de MongoDB.

---

## 2. Levantar el servidor

### Paso 1 — Clonar e instalar dependencias

```bash
git clone <repo-url>
cd hexagonal
npm install
```

### Paso 2 — Crear el archivo `.env`

Copia la plantilla y ajusta los valores:

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
> incluso si decides no usar MongoDB: el contenedor las valida todas al arrancar.

### Paso 3 — (Opcional) Levantar MongoDB con Docker

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

Si todo va bien verás:

```
Server running on port 3000
```

Verificación rápida:

```bash
# salud básica del servicio (lista vacía, 200)
curl http://localhost:3000/users

# registrar usuario
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada","email":"ada@demo.com","password":"secret123"}'
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
| `npm run build` | `rimraf dist && tsc` | Limpia `dist/` y compila TypeScript |
| `npm start` | `node dist/main.js` | Ejecuta la versión compilada |
| `npm test` | *(placeholder)* | Aún sin pruebas definidas |

---

## 5. La arquitectura hexagonal

También llamada **Ports & Adapters** (Alistair Cockburn). La idea central:

> El **dominio** es el centro de la aplicación y **no conoce** nada del exterior
> (ni Express, ni Mongoose, ni JWT, ni la base de datos). Todo lo externo se conecta
> al núcleo mediante **puertos** (interfaces) y se implementa en **adaptadores**.

```mermaid
flowchart LR
    subgraph ADAPTADORES_ENTRADA["Adaptadores de entrada (Driving)"]
        HTTP["HTTP<br/>routes + controllers<br/>Express"]
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

En este repositorio, esa teoría se materializa en carpetas:

```
src/modules/<modulo>/
├── domain/            ← hexágono (núcleo): modelos, VOs, comandos, PUERTOS
├── application/       ← hexágono: casos de uso y DTOs de la app
└── infrastructure/    ← fuera del hexágono: ADAPTADORES
    └── adapters/
        ├── input/http/{routes,controllers}    ← adaptadores de ENTRADA
        └── output/persistence/{in-memory,mongo} ← adaptadores de SALIDA
```

**Analogía de la arquitectura hexagonal aplicada:**

| Concepto hexagonal | Aquí es... |
|---|---|
| Hexágono (core) | `domain/` + `application/` |
| Puerto de entrada | Contrato de los *use cases* (`interface UseCase { execute(...) }`) invocado por los controllers |
| Puerto de salida | `domain/ports/output/*.repository.ts` (p. ej. `UserRepositoryPort`) |
| Adaptador de entrada | `infrastructure/adapters/input/http/**` (routes + controllers de Express) |
| Adaptador de salida | `infrastructure/adapters/output/persistence/**` (in-memory y mongo) |
| Composition Root | `src/container.ts` |

---

## 6. Capa `domain` — El núcleo

Es el corazón del hexágono. **Solo contiene lógica de negocio y no importa nada de `infrastructure`,
Express, Mongoose ni `common` de carácter técnico** (únicamente contratos como `ApiOneResponse`).

```
domain/
├── models/
│   ├── user.ts                  # Entidad User (compuesta por Value Objects)
│   ├── commands/                # Create-Update: intención de cambio
│   │   ├── create-user.command.ts
│   │   └── update-user.command.ts
│   └── value-objects/           # Tipos con validación intrínseca
│       ├── user-id.ts
│       ├── user-email.ts
│       ├── user-name.ts
│       ├── user-password.ts
│       ├── user-roles.ts
│       ├── user-created-at.ts
│       ├── user-updated-at.ts
│       └── user-last-access.ts
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

Si el dato es inválido, la validación ocurre **antes** de que llegue a la base de datos:
la regla de negocio vive en el dominio, no en el controller ni en el schema de Mongoose.

### Entities

```ts
// src/modules/user/domain/models/user.ts
export class User {
    constructor(
        public id: UserId,
        public name: UserName,
        public email: UserEmail,
        public password: UserPassword,
        public roles: UserRoles,
        public createdAt: UserCreatedAt,
        public updatedAt: UserUpdatedAt,
        public lastAccess: UserLastAccess,
    ) { }

    public mapToPrimitive() { /* VO -> objeto plano serializable */ }
}
```

### Commands

Son el **transporte de intención** desde la capa de aplicación hacia el dominio/almacén.
`CreateUserCommand` y `UpdateUserCommand` llevan Value Objects ya construidos y validados,
nunca `string` crudos.

---

## 7. Capa `application` — Casos de uso

Coordina el flujo: **recibe el DTO de entrada → construye VOs/Commands → invoca un puerto →
transforma la salida en DTO de respuesta**. Aquí vive el *"qué hace la aplicación"*.

```
application/
├── dto/
│   ├── requests/    # CreateUserRequest, UpdateUserRequest (validación + shape)
│   └── responses/   # UserPrimitiveResponse (serialización hacia el cliente)
└── use-cases/
    ├── create-user.use-case.ts
    ├── update-user.use-case.ts
    ├── find-one-user.use-case.ts
    ├── find-all-user.use-case.ts
    └── remove-one-user.use-case.ts
```

Ejemplo completo de un caso de uso:

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

**Clave:** el caso de uso **no sabe** si el comando va a MongoDB, a memoria o a un archivo.
Solo conoce `UserRepositoryPort`. Esto es lo que permite intercambiar adaptadores sin
tocar una sola línea de la capa de aplicación.

Los casos de uso también se comunican hacia atrás con el *presentation* mediante los
contratos `ApiOneResponse<T>` / `ApiAllResponse<T>` y DTOs de respuesta primitivos
(`UserPrimitiveResponse`, `AuthPrimitiveResponse`) que ya vienen desacoplados de las
clases de dominio.

---

## 8. Capa `infrastructure` — Adaptadores

Los adaptadores son **piezas intercambiables** que traducen entre el exterior y el hexágono.

```
infrastructure/adapters/
├── input/                         # Adaptadores de ENTRADA (Driving adapters)
│   └── http/
│       ├── routes/                # Mapean verbo+path -> handler
│       │   ├── user.route.ts
│       │   └── auth.route.ts
│       └── controllers/           # Traducen HTTP <-> aplicación
│           ├── user.controller.ts
│           └── auth.controller.ts
└── output/                        # Adaptadores de SALIDA (Driven adapters)
    └── persistence/
        ├── in-memory/             # Repo en arreglo + mapper
        │   ├── in-memory-user.repository.ts
        │   ├── in-memory-user.mapper.ts
        │   ├── in-memory-auth.repository.ts
        │   └── in-memory-auth.mapper.ts
        └── mongo/                 # Repo Mongoose + schema + mapper
            ├── mongo-user.model.ts
            ├── mongo-user.repository.ts
            └── mongo-user.mapper.ts
```

### Adaptadores de entrada: routes + controllers

- **Routes** (`*.route.ts`) — declaran el contrato HTTP. Cada módulo expone un `Router`
  mediante un *getter* `routes`, y `FactoryRoutes` los monta bajo `/users` y `/auth`.
- **Controllers** (`*.controller.ts`) — hacen tres cosas y nada más:
  1. Validan la petición (`Dto.validate(req.body)` / `PaginationDto.validate(req.query)`).
  2. Invocan el caso de uso correspondiente.
  3. Traducen resultado/error a una respuesta HTTP con `Handler`.

```ts
create = (req: Request, res: Response) => {
    const [errors, createUserRequest] = CreateUserRequest.validate(req.body);
    if (errors) return res.status(400).json({ statusCode: 400, statusMsg: "BAD_REQUEST",
                                              errors: Object.values(errors).flat(2) });
    this.createUserUseCase.execute(createUserRequest!)
        .then(user => res.status(201).json(user))
        .catch(err => this.handlerError.error(err, res));
}
```

> El controller **nunca** toca la base de datos ni conoce los repositorios:
> solo conoce casos de uso. Es el único punto donde aparece `express`.

### Adaptadores de salida: persistencia

| Adaptador | Clase | Implementa | Cuándo se usa |
|---|---|---|---|
| In-memory | `InMemoryUserRepository` | `UserRepositoryPort` | Por defecto; pruebas; desarrollo sin BD |
| In-memory | `InMemoryAuthRepository` | `AuthRepositoryPort` | Autenticación sobre el repo de usuarios en memoria |
| MongoDB | `MongoUserRepository` | `UserRepositoryPort` | Persistencia real vía Mongoose |

Cada adaptador de salida incluye un **Mapper** (`toDomain` / `toPrimitive`) que convierte
entre el formato del medio (documento Mongoose, objeto plano) y las entidades del dominio.
Los repositorios devuelven **tipos de dominio**, nunca documentos de Mongoose.

**Resolución actual:** en `src/container.ts` están cableados los adaptadores **in-memory**;
el adaptador Mongo aparece comentado, listo para activarse (ver §16).

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
  (`*Repository implements *Port`). Dirige la información *hacia afuera*.
- **Puerto de entrada (input):** en este proyecto lo representan los contratos
  `interface UseCase { execute(...) }` que exponen los casos de uso y que invocan los
  controllers/adaptadores de entrada. La información entra *desde* el exterior.

> Este diseño garantiza que **la dependencia siempre apunta hacia el núcleo**:
> el puerto vive en `domain/`, y solo la infraestructura lo importa para implementarlo.

---

## 10. `common` — Infraestructura transversal

Compartido por todos los módulos (no es dominio, es soporte transversal):

```
src/common/
├── config/
│   ├── envs.config.ts        # Lectura validada de .env (env-var + dotenv)
│   ├── jwt.config.ts         # generateToken / validateToken / renewToken (jsonwebtoken)
│   ├── bcrypt.config.ts      # hashPassword / comparePassword (bcryptjs)
│   └── validators.config.ts  # isEmail / isMongoId (regex)
├── databases/mongodb/
│   └── mongo-connect.ts      # Clase MongoDB.connect() con mongoose.connect()
├── dtos/pagination/
│   └── pagination.dto.ts     # PaginationDto.validate(req.query) -> [errors, dto]
├── enums/
│   ├── http-status.enum.ts   # Mapa código HTTP -> texto
│   └── user-roles.enum.ts    # Roles de usuario (Roles.USER, ...)
├── errors/
│   ├── manager.error.ts      # ManagerError con fábricas estáticas (badRequest, notFound, ...)
│   ├── add.error.ts          # Acumulador de errores de validación de DTOs
│   └── handler.error.ts      # Handler: ManagerError|Error -> respuesta JSON
└── interfaces/
    ├── api-response.interface.ts  # ApiOneResponse<T> / ApiAllResponse<T>
    ├── status.interface.ts        # { statusCode, statusMsg, error }
    └── metadata.interface.ts      # { total, page, lastPage, limit }
```

**Manejo de errores:** los Value Objects y casos de uso lanzan `ManagerError`
(`ManagerError.badRequest('...')`, `ManagerError.notFound('...')`, etc.), y el
`Handler` del controller lo traduce a HTTP:

```json
{ "statusCode": 400, "statusMsg": "BAD_REQUEST", "errors": ["Password must be at least 6 characters long"] }
```

Cualquier `Error` no controlado responde `500 INTERNAL_SERVER_ERROR`.

---

## 11. Composition Root: `container.ts`

[`src/container.ts`](src/container.ts) es el **único lugar de la aplicación donde se conoce
la implementación concreta**. Aquí se instancia todo y se inyectan las dependencias
(**constructor injection**, sin frameworks de DI):

```ts
// Adaptadores de salida (intercambiables)
const inMemoryUserMapper    = new InMemoryUserMapper();
const inMemoryUserRepository = new InMemoryUserRepository(inMemoryUserMapper);

// Casos de uso (reciben el PUERTO, no la clase concreta)
const createUserUseCase = new CreateUserUseCase(inMemoryUserRepository);
const updateUserUseCase = new UpdateUserUseCase(inMemoryUserRepository);
// ...

// Adaptadores de entrada
export const userController = new UserController(
    createUserUseCase, updateUserUseCase, findOneUserUseCase,
    findAllUserUseCase, removeUserUseCase, handlerError
);
export const userRoutes = new UserRoutes(userController);

// Auth
const inMemoryAuthRepository = new InMemoryAuthRepository(inMemoryUserRepository, inMemoryAuthMapper);
const signInUseCase = new SignInUseCase(inMemoryAuthRepository, jwtConfig);
const signUpUseCase = new SignUpUseCase(inMemoryAuthRepository);
const authController = new AuthController(signInUseCase, signUpUseCase, handlerError);
export const authRoutes = new AuthRoutes(authController);

// Composición del servidor
export const factoryRoutes = new FactoryRoutes(userRoutes, authRoutes);
export const server        = new AppServer(factoryRoutes);
export const mongodb       = new MongoDB({ mongoUrl: envs.MONGO_URL, dbName: envs.MONGO_DB_NAME });
```

Para cambiar la persistencia **basta con cambiar estas líneas**: ninguna otra capa se entera.

---

## 12. Bootstrapping: `main.ts`, `server.ts`, `factory.route.ts`

| Archivo | Responsabilidad |
|---|---|
| [`src/main.ts`](src/main.ts) | Punto de entrada: carga `envs` y arranca `server.start(envs.PORT)` (con `try/catch` + `process.exit(1)`). |
| [`src/server.ts`](src/server.ts) | `AppServer`: configura `express.json()`, `express.urlencoded()`, monta las rutas globales y hace `listen(port)`. |
| [`src/factory.route.ts`](src/factory.route.ts) | `FactoryRoutes`: agrupa los routers de cada módulo → `/users`, `/auth`. |
| [`src/container.ts`](src/container.ts) | Composition Root (ver §11). |

Flujo de arranque:

```
npm run dev
   └─> main.ts
         ├─> container.ts        (construye toda la gráfica de objetos)
         └─> server.start(PORT)
               ├─> middlewares globales (json, urlencoded)
               ├─> app.use(FactoryRoutes.routes)
               │      ├─> /users  -> UserRoutes  -> UserController  -> UseCases -> RepositoryPort
               │      └─> /auth   -> AuthRoutes  -> AuthController  -> UseCases -> AuthRepositoryPort
               └─> app.listen(PORT) -> "Server running on port 3000"
```

> **Nota:** en `main.ts` la línea `await mongodb.connect()` está comentada y, en consecuencia,
> también el cableado de `MongoUserRepository` en `container.ts`. La API arranca con los
> repositorios **in-memory**. Para usar MongoDB, sigue los pasos de §16.

---

## 13. Estructura del proyecto

```
hexagonal/
├── .env                    # Config local (NO commitear)
├── .env.template           # Plantilla de variables de entorno
├── docker-compose.yml      # MongoDB 6.0.6 en puerto 27017
├── package.json            # Scripts: dev / build / start
├── tsconfig.json           # strict: true, rootDir: src, outDir: dist
├── data/mongo/             # Volumen de datos de MongoDB (ignorado por git)
├── dist/                   # Build compilado (ignorado por git)
└── src/
    ├── main.ts             # Bootstrap
    ├── server.ts           # AppServer (Express)
    ├── factory.route.ts    # Agrupación de rutas
    ├── container.ts        # Composition Root (inyección de dependencias)
    ├── common/             # Soporte transversal (§10)
    └── modules/
        ├── user/
        │   ├── domain/         # modelos, VOs, commands, ports
        │   ├── application/    # use-cases, dto
        │   └── infrastructure/ # adapters input/http + output/persistence
        └── auth/
            ├── domain/         # Auth, SignIn/SignUpCommand, AuthRepositoryPort
            ├── application/    # signIn/signUp use-cases, dtos
            └── infrastructure/ # auth controller/routes + in-memory auth repo
```

---

## 14. Reglas de dependencia (las flechas siempre apuntan hacia adentro)

```
infrastructure  ──implements──▶  ports (domain)  ◀──consumes──  application  ──▶  domain
      ▲                                                                    │
      └───────────────────  (solo el container.ts sabe quién es quién)  ◀──┘
```

1. `domain` **no importa** nada de `application`, `infrastructure` ni librerías externas.
2. `application` importa `domain` (entidades, VOs, commands y **puertos**), nunca adaptadores.
3. `infrastructure` importa `domain` (para implementar puertos) y, vía controller, `application`.
4. Solo `container.ts` conoce **simultáneamente** adaptadores y casos de uso.
5. Si necesitas violar alguna regla (p. ej. usar `HttpStatus` del dominio), se hace a través
   de contratos en `common/interfaces`, no importando infraestructura.

Estas reglas son lo que hace posible cambiar Express por Fastify, o Mongo por PostgreSQL,
**sin reescribir ni una línea del dominio ni de los casos de uso**.

---

## 15. API: endpoints y formatos de respuesta

Base URL: `http://localhost:{{PORT}}`

### Users — `/users`

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/users` | Crea un usuario |
| `GET` | `/users` | Lista usuarios (paginado: `?page=1&limit=10`) |
| `GET` | `/users/:id` | Obtiene un usuario por id (valida formato MongoID) |
| `PATCH` | `/users/:id` | Actualiza campos (`name`, `email`, `password`) |
| `DELETE` | `/users/:id` | Elimina un usuario |

### Auth — `/auth`

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/auth/sign-up` | Registra un usuario (`name`, `email`, `password`) |
| `POST` | `/auth/sign-in` | Devuelve `{ user, token }` con JWT de 2h |

### Ejemplos

```bash
# Crear usuario
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada Lovelace","email":"ada@demo.com","password":"secret123"}'

# Listar (paginado)
curl "http://localhost:3000/users?page=1&limit=5"

# Obtener uno
curl http://localhost:3000/users/<id>

# Actualizar
curl -X PATCH http://localhost:3000/users/<id> \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada L."}'

# Eliminar
curl -X DELETE http://localhost:3000/users/<id>

# Registro e inicio de sesión
curl -X POST http://localhost:3000/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada","email":"ada@demo.com","password":"secret123"}'

curl -X POST http://localhost:3000/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@demo.com","password":"secret123"}'
```

### Formatos de respuesta

**Recurso único** (`ApiOneResponse<T>`):

```json
{
  "status": { "statusCode": 200, "statusMsg": "OK", "error": null },
  "data": { "id": "1", "name": "Ada", "email": "ada@demo.com",
            "roles": ["USER"], "createdAt": "...", "updatedAt": "...", "lastAccess": "..." }
}
```

**Colección** (`ApiAllResponse<T>`):

```json
{
  "meta": { "total": 1, "page": 1, "lastPage": 1, "limit": 10 },
  "status": { "statusCode": 200, "statusMsg": "OK", "error": null },
  "data": [ { "...": "..." } ]
}
```

**Sign-in:**

```json
{
  "status": { "statusCode": 200, "statusMsg": "OK", "error": null },
  "data": {
    "user": { "id": "1", "name": "Ada", "email": "ada@demo.com", "roles": ["USER"] },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Errores de validación** (400):

```json
{ "statusCode": 400, "statusMsg": "BAD_REQUEST", "errors": ["Name is required"] }
```

**Errores de servidor** (500):

```json
{ "statusCode": 500, "statusMsg": "INTERNAL_SERVER_ERROR", "errors": ["..."] }
```

### Códigos más frecuentes

| Código | Cuándo |
|---|---|
| `200 OK` | Lecturas y actualizaciones exitosas |
| `201 CREATED` | `POST /users` y `POST /auth/sign-up` |
| `400 BAD_REQUEST` | DTO inválido, id que no es MongoID, password < 6 caracteres |
| `401 UNAUTHORIZED` | Token inválido *(uso previsto)* |
| `404 NOT_FOUND` | Recurso inexistente |
| `500 INTERNAL_SERVER_ERROR` | Error no controlado |

---

## 16. Cambiando de adaptador (in-memory ↔ MongoDB)

La promesa de la arquitectura: **cambiar la persistencia no toca ni el dominio ni los casos de uso.**

**1.** Levanta la base:

```bash
docker compose up -d
```

**2.** En [`src/container.ts`](src/container.ts), cambia la instancia del repositorio:

```ts
// ❌ Actual (in-memory)
const inMemoryUserMapper     = new InMemoryUserMapper();
const inMemoryUserRepository = new InMemoryUserRepository(inMemoryUserMapper);

// ✅ MongoDB
const mongoUserRepository = new MongoUserRepository(
    UserModel,
    new MongoUserMapper(),
    new BcryptConfig(),   // hash de contraseñas al persistir
);
```

**3.** Pasa el nuevo repositorio a los casos de uso:

```ts
const createUserUseCase = new CreateUserUseCase(mongoUserRepository);
const updateUserUseCase = new UpdateUserUseCase(mongoUserRepository);
const findOneUserUseCase = new FindOneUserUseCase(mongoUserRepository);
const findAllUserUseCase = new FindAllUserUseCase(mongoUserRepository);
const removeUserUseCase  = new RemoveUserUseCase(mongoUserRepository);
```

**4.** Habilita la conexión a BD en [`src/main.ts`](src/main.ts):

```ts
await mongodb.connect();   // descomenta esta línea
server.start(envs.PORT);
```

Listo: `MongoUserRepository implements UserRepositoryPort`, así que los casos de uso
no cambian en absoluto. El mismo razonamiento aplica al módulo `auth`
(`MongoAuthRepository` puede agregarse bajo `output/persistence/mongo/` implementando
`AuthRepositoryPort`, sin tocar `SignInUseCase`/`SignUpUseCase`).

---

## 17. Convenciones y buenas prácticas del repo

- **Naming:** `*.use-case.ts`, `*.repository.ts` (puerto: `*.port.ts`), `*.controller.ts`,
  `*.route.ts`, `*.mapper.ts`, `*.dto.ts`, `*.command.ts`, VOs en kebab-case (`user-email.ts`).
- **Inyección por constructor** sin framework de DI; la composición vive solo en `container.ts`.
- **Validación en dos anillos:** forma/formato en los DTOs (`XxxRequest.validate`) y reglas de
  negocio en los Value Objects (constructor con `throw ManagerError`).
- **Errores** siempre con las fábricas de `ManagerError` para que `Handler` pueda serializarlos.
- **DTOs de salida primitivos** (`UserPrimitiveResponse`, `AuthPrimitiveResponse`) en lugar de
  exponer entidades de dominio crudas.
- **`tsconfig.json` en `strict: true`** con `noUncheckedIndexedAccess` y
  `exactOptionalPropertyTypes`: se espera acceso por índice comprobado (`users[i]!`).
- **Seguridad:** nunca expongas `.env` ni `JWT_SECRET`; usa `BcryptConfig` para hashing;
  el JWT se firma con expiración de 2h (`JwtConfig.generateToken`).
- **Git ignora:** `node_modules`, `dist`, `data/`, `.env`.

### Roadmap sugerido

- [ ] Middleware de autorización que valide el `Authorization: Bearer <token>` con
      `JwtConfig.validateToken` y aplique `Roles` (hoy `validateToken` existe pero no se usa).
- [ ] Adaptador `MongoAuthRepository` + conexión a BD habilitada por defecto.
- [ ] Suite de tests (los puertos hacen trivialmente testable la lógica con repos *fake*).
- [ ] Rate limiting, helmet y CORS configurado (el paquete `cors` ya está en dependencias).

---

## Licencia

ISC
