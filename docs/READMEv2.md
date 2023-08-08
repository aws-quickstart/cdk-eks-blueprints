# How to run V2

### Start the server
```bash
make run-server
```

### Run a client
Clone the client [github repo](https://github.com/zjaco13/multi-lang-eks-blueprints-cdk)
```bash
git clone https://github.com/zjaco13/multi-lang-eks-blueprints-cdk.git
cd multi-lang-eks-blueprints-cdk
```

Run the example for the chosen client

go:
```bash
make go-example
```

rust:
```bash
make rust-example
```

python:
```bash
make python-example
```

### Deploy the built cluster
Go back to the cdk-eks-blueprints project

```bash
make deploy-server
```
