class Session
{
    constructor(pin)
    {
        this.id = pin;
        this.pin = pin;
        this.clients = new Set; 
    }

    broadcast(data)
    {
        if (webSocketLogLevel >= WebSocketLogLevels.Minimal)
            console.log("Broadcasting to all %s connected clients in session '%s'. Message type: '%s'", this.clients.size, this.id, data.type);

        this.clients.forEach(client => client.send(data));
    }

    leave(client) {
        if (client.session !== this) throw { message: "The client is not in this session" };
		
		this.clients.delete(client);
		client.session = null;
    }
}

module.exports = Session;