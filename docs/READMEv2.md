# How to run V2

### Start the server
```bash
make run-server
```

### Run a client
Clone the client [github repo](https://github.com/zjaco13/multi-lang-eks-blueprints-cdk) and change directories to the client language you would like to use
```bash
git clone https://github.com/zjaco13/multi-lang-eks-blueprints-cdk.git
cd multi-lang-eks-blueprints-cdk/sdks
cd go
# cd rust
# cd python
```

Run the example for the chosen client

go:
```bash
go run example/main.go
```

rust:
```bash
cargo run --example client-example
```

python:
```bash
python3 test.py
```

### Deploy the built cluster
Go back to the cdk-eks-blueprints project

```bash
make deploy-server
```
