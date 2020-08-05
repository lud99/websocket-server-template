const WebSocketServer = require("ws").Server;

const Client = require("./Client");
const Session = require("./Session");

const Utils = require("../utils/Utils");

const pingTime = 3000;

const logPingMessages = false;

let ws;

var sessions = new Map();

const start = (server, path) => {
    ws = new WebSocketServer({ server, path });

    console.log("Websocket server running on path '%s'", path)

    ws.on("connection", onConnection);
}

const onConnection = (conn) => {
    // Create client
    const client = new Client(conn, Utils.createId());

    if (webSocketLogLevel >= WebSocketLogLevels.Minimal)
        console.log("Client '%s' connected", client.id);

    // Remove the client from any sessions
    conn.on("close", () => disconnectClient(client));

    // Handle messages
    conn.on("message", message => handleMessage(client, JSON.parse(message)));

    // Setup ping pong
    client.pingPongTimer = setInterval(() => pingPong(client), pingTime);
}

const handleMessage = async (client, message) => {
    try {
        switch (message.type) {
            // Sessions
            case "join-session": {
                const sessionId = message.data.sessionId

                client.joinSession(sessions, sessionId);

                const response = {
                    sessionId: sessionId
                }

                client.sendResponse(response, message, client.SendType.Single);
            } 

            // Ping Pong
            case "pong": {
                client.isAlive = true; // The client is still connected

                if (logPingMessages) console.log("Received pong from client '%s'", client.id);
                
                break;
            }

            default: {
                console.log("Other message:", message);

                break;
            }
        }
    } catch (error) {
        console.log(message);
        console.error(error);
    }
}

const pingPong = (client) => {
    // Terminate the connection with the client if it isn't alive
    if (!client.isAlive) return client.terminate();

    // Default the client to being disconnected, but if a pong message is received from them they are considered still alive
    client.isAlive = false;

    if (logPingMessages) console.log("Sending ping to client '%s'", client.id);

    client.ping();
}

const disconnectClient = (client) => {
    const session = client.session;
            
    // If the client is in a session
    if (session) {
        session.leave(client); // Remove the client from the session

        if (webSocketLogLevel >= WebSocketLogLevels.Minimal)
            console.log("Client '%s' disconnected, %s clients remaining in session '%s'", client.id, session.clients.size, session.id);

        // Remove the session if it's empty
        if (session.clients.size == 0) {
            sessions.delete(session.id);

            if (webSocketLogLevel >= WebSocketLogLevels.Minimal)
                console.log("Removing empty session '%s'", session.id);
        }
    } else {
        if (webSocketLogLevel >= WebSocketLogLevels.Minimal)
            console.log("Client '%s' disconnected", client.id);
    }

    // Remove the ping pong
    clearInterval(client.pingPongTimer);

    // Terminate the connection
    client.terminate();
}

const sendResponse = (client, response, originalMessage, sendType = Send.Single) => {
    
    // Send back a formatted response with type, success, original message and the data
    const res = {
        type: originalMessage.type,
        success: true,

        originalMessage: originalMessage,
        data: response
    }

    if (sendType === Send.Single) 
        client.send(res);
    else if (sendType === Send.Broadcast)
        client.session.broadcast(res);
}

module.exports = start;