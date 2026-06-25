const ftp = require("basic-ftp");
const path = require("path");

async function uploadDist() {
    const client = new ftp.Client();
    client.ftp.verbose = true;
    try {
        console.log("Conectando al servidor FTP de InfinityFree...");
        await client.access({
            host: "ftpupload.net",
            user: "if0_42140719",
            password: "URMNff0lvES9f0I",
            secure: false
        });
        console.log("Conectado con éxito.");
        
        // Entrar a htdocs
        await client.cd("htdocs");
        console.log("Subiendo los archivos compilados de la carpeta dist/ a htdocs/...");
        
        // Subir los contenidos de la carpeta dist local a la carpeta actual (htdocs) del servidor
        await client.uploadFromDir(path.join(__dirname, "dist"));
        
        console.log("¡Todo el sitio compilado (dist) se ha subido exitosamente a InfinityFree!");
    }
    catch(err) {
        console.error("Error al subir los archivos:", err);
    }
    client.close();
}

uploadDist();
