import dotenv from "dotenv";

dotenv.config({
    path : ".env.test",
    override : true
})

const databaseUrl = process.env.DATABASE_URL;

if(!databaseUrl){
    throw new Error("DATABASE_URL is missing from .env.test");
}

let databaseName : string;

try{
    databaseName = new URL(databaseUrl).pathname.slice(1);
}
catch{
    throw new Error("DATABASE_URL in .env.test is not a valid URL");
}

if (databaseName !== "minicrm_test") {
    throw new Error(
        `Tests must use minicrm_test, but configured database is "${databaseName}"`
    );
}