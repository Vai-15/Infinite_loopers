.PHONY: train compile test

train:
	cd ml && python models/train_model.py

compile:
	npm run compile

test:
	npm test
