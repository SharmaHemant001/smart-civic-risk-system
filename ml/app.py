from fastapi import FastAPI
from pydantic import BaseModel
from model import predict_issue

app = FastAPI()


class ImageInput(BaseModel):
    imageUrl: str


@app.post("/predict")
def predict(data: ImageInput):
    issue = predict_issue(data.imageUrl)

    return {
        "issueType": issue,
        "confidence": 0.9
    }
