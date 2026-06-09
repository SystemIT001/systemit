const ftp = require("basic-ftp");
const path = require("path");

async function uploadDir() {
    const client = new ftp.Client()
    client.ftp.verbose = true
    try {
        await client.access({
            host: "ftpupload.net",
            user: "if0_42140719",
            password: "URMNff0lvES9f0I",
            secure: false
        })
        console.log("Conectado al servidor FTP");
        
        // Entrar a htdocs
        await client.cd("htdocs");
        
        // Crear carpeta uploads si no existe (esto automáticamente entra a la carpeta)
        await client.ensureDir("uploads");
        
        console.log("Subiendo imágenes...");
        
        // Subir la carpeta completa desde local a remoto
        await client.uploadFromDir(path.join(__dirname, "uploads"));
        
        console.log("¡Todas las imágenes se subieron exitosamente al servidor en la nube!");
    }
    catch(err) {
        console.log(err)
    }
    client.close()
}

uploadDir()
