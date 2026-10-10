import http from "node:http";
import { listLeads } from "./services/leadService.js";

const server = http.createServer(async(req, res) => {
    if(req.method === "GET" && req.url === "/health"){
        res.writeHead(200, {
            "Content-Type" : "application/json"
        });
        res.end(JSON.stringify({"status" : "ok"}));
    }
    else if(req.method === "GET" && req.url ==="/leads"){
        const leads = await listLeads();
        res.writeHead(200, {
            "Content-Type" : "application/json"
        });
        res.end(JSON.stringify(leads));
    }
    else {
    res.writeHead(404, {
        "Content-Type": "application/json"
    });

    res.end(JSON.stringify({ error: "Route not found" }));
    }
});

server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});