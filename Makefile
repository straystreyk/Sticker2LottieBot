IMAGE_NAME=sticker2lottiebot
PLATFORM=linux/amd64
TAR_NAME=tgsbot.tar

build:
	docker buildx build \
		--platform $(PLATFORM) \
		-t $(IMAGE_NAME) \
		--load \
		.

save:
	docker save -o $(TAR_NAME) $(IMAGE_NAME)

release: build save