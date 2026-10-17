//src/server.ts
import myApp from "./app.js";

myApp.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
