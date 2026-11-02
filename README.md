# Cara de caca — versión online

Servidor sin dependencias (solo Node.js 18 o superior). Archivos: `server.js`, `engine.js`, `index.html`, `package.json`.

## Probar en tu computador
1. Instala Node.js desde nodejs.org.
2. En la carpeta de estos archivos: `node server.js`
3. Abre http://localhost:3000. Crea una sala y comparte el código.
4. Amigos en tu misma red WiFi entran con http://TU-IP-LOCAL:3000 (en Windows: `ipconfig`).

## Publicarlo en internet (ejemplo con Render)
1. Sube los 4 archivos a un repositorio de GitHub.
2. En render.com: New > Web Service > conecta el repositorio.
3. Runtime: Node. Build Command: (vacío o `echo ok`). Start Command: `node server.js`.
4. Comparte la URL que te da Render. Revisa render.com/pricing: las condiciones del plan gratis cambian.
   Los hostings gratis suelen "dormir" si nadie entra por un rato; el primer ingreso puede tardar ~1 minuto.

## Notas
- Mínimo 3 asientos: si hay menos, el servidor completa con bots. Máximo 6.
- Si alguien se desconecta en plena partida, su asiento pasa a ser un bot.
- Las cartas ocultas (manos y boca abajo) nunca se envían a los demás jugadores.

## Cuentas y registro de derrotas
- Al crear o unirse a una sala, escribe un nombre y un PIN (4 a 12 letras o números). Si el nombre es nuevo, se crea la cuenta; si ya existe, el PIN debe coincidir. Sin PIN se juega como invitado (sin registro).
- Al terminar cada partida se suma 1 partida a cada jugador con cuenta y 1 derrota al "cara de caca". Si alguien se desconecta y su asiento pierde, también cuenta como derrota. Las partidas que no terminan no se cuentan.
- El botón "🏆 Derrotas" del menú muestra el ranking. Los PIN se guardan cifrados, pero no hay forma de recuperarlos si se olvidan.
- Los datos viven en `data/users.json` (o en la carpeta de la variable de entorno `DATA_DIR`).
- **Importante en Render gratis:** el disco se borra cada vez que el servicio se reinicia o se vuelve a publicar (por ejemplo al subir archivos nuevos a GitHub). Para que el registro sobreviva hay que añadir un "Disk" de pago en Render, montarlo en `/data` y crear la variable `DATA_DIR=/data`.
