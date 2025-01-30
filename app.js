import {readFile, writeFile} from 'fs/promises';
import {createServer} from 'http';
import crypto from 'crypto';
import path from "path";
import {json} from "stream/consumers";

const PORT = process.env.PORT || 3003;

const DATA_FILE = path.join("data", "links.json");

const serveFile = async(res, filePath, contentType) => {
    try{
        const data = await readFile(filePath);
        res.writeHead(200, {'Content-Type': contentType});
        res.end(data);
    }catch(err){
        console.log(err);
        res.writeHead(500, {'Content-Type': 'text/plain'});
        res.end('500 - Internal Server Error');
    }
}

const loadLinks = async() => {
    try{
        const data = await readFile(DATA_FILE, 'utf-8');
        return JSON.parse(data);
    }catch(err){
        if(err.code === 'ENOENT'){
            await writeFile(DATA_FILE, JSON.stringify({}));
            return {};
        }
        throw err;
    }
}

const saveLinks = async(links) => {
    await writeFile(DATA_FILE, JSON.stringify(links));
}

const server = createServer(async(req, res) => {
    if(req.method === 'GET'){
        if(req.url === '/'){
            return serveFile(res, path.join("public", "index.html"), 'text/html');
        }else if(req.url === '/style.css'){
            return serveFile(res, path.join("public", "style.css"), 'text/css');
        }else if(req.url === '/links.json'){
            const links = await loadLinks();
            res.writeHead(200, {'Content-Type': 'application/json'});
            return res.end(JSON.stringify(links));
        }else{
            const links = await loadLinks();
            const shortCode = req.url.slice(1);
            console.log('link red.', shortCode);
            // console.log(shortCode);
            if(links[shortCode]){
                res.writeHead(302, { Location: links[shortCode] });
                return res.end();
            }

            res.writeHead(404, {'Content-Type': 'text/plain'});
            return res.end('404 - Not Found');
        }
    }

    if(req.method === "POST" && req.url === '/shorten'){
        
        const links = await loadLinks();
        
        let body = "";
        req.on('data', (chunk) => {
            body += chunk;
        })
        req.on('end',async ()=>{
            console.log(body);
            const {url , shortCode} = JSON.parse(body);

            if(!url){
                res.writeHead(400, {'Content-Type': 'text/plain'});
                return res.end('URL IS REQUIRED');
            }

            const finalshortCode = shortCode || crypto.randomBytes(4).toString('hex');

            if(links[finalshortCode]){
                res.writeHead(400, {'Content-Type': 'text/plain'});
                return res.end('SHORTCODE ALREADY EXISTS');
            }

            links[finalshortCode] = url;
            await saveLinks(links);

            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({success: true, shortCode: finalshortCode}));
        })
    }
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
})
