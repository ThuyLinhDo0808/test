# Run frontend only (dev)

cd frontend && yarn dev

# Run backend only (dev)

cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

Remember to download llama3.1 from ollama using ollama pull llama3.1 to run the backend

# Or run full stack with Docker

`docker-compose up --build --detach`

Then run this command to download the model: `docker exec -it <container-name> ollama pull llama3.1`

To verify if the model is downloaded, run: `docker exec -it <container-name> ollama list`.

Replace <container-name> with your ollama container. For example: aura-ollama. To get the name of the ollama container, run: docker ps

# Run the docker without the Wifi:

Pull all required images to the docker (wifi is required):
`docker pull python:3.9-slim`
`docker pull node:18-alpine`
`docker pull nginx:1.23-alpine`
`docker pull redis:alpine`
`docker pull ollama/ollama`

Then run this command:
`docker-compose up --build --detach`
