const Session = require("./Session");

class Client {
    constructor(conn, id) {
        this.conn = conn;
        this.id = id;

        this.isAlive = true;

        this.pingPongTimer = null;

        this.session = null;

        this.SendType = {
            Single: 0,
            Broadcast: 1, 
        }
    }

    send(data) {
        this.conn.send(JSON.stringify(data));
    }

    ping() {
        this.send({ type: "ping" });
    }

    terminate() {
        this.conn.terminate();
    }

    joinSession(sessions, sessionId) {
        // Make sure the session id is a string (otherwise it causes duplicate sessions, one for the number and one for the string variants)
        sessionId = sessionId.toString();

        // Don't join the session if the client is already in it
        if (this.session && this.session.id === sessionId)
            return;

        // Create the session if it doesn't exists
        let session = sessions.get(sessionId);
        if (!session) {
            session = new Session(sessionId);
            sessions.set(sessionId, session);
        }

        // Leave the current session if one exists
        if (this.session) {
            this.session.leave(this);

            console.log("Client '%s' leaving session '%s', %s clients in Session", this.id, this.session.id, this.session.clients.size);
        }

        // Add self to the session
        this.session = session;
        this.session.clients.add(this);

        if (webSocketLogLevel >= WebSocketLogLevels.Minimal)
            console.log("Adding client '%s' to Session '%s', %s clients in Session", this.id, sessionId, session.clients.size);
    }

    sendResponse(response, originalMessage, sendType = this.SendType.Single) {
        // Send back a formatted response with type, success, original message and the data
        const res = {
            type: originalMessage.type,
            success: true,

            originalMessage: originalMessage,
            data: response
        }

        if (sendType === this.SendType.Single) 
            this.send(res);
        else if (sendType === this.SendType.Broadcast)
            this.session.broadcast(res);
    }
}

module.exports = Client;