## mongo docker command

```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=AdminAddmyco \
  -e MONGO_INITDB_ROOT_PASSWORD=myNamecard6013g \
  -e MONGO_INITDB_DATABASE=addmyco \
  mongo
```
