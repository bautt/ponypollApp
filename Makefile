.PHONY: deps dev build package deploy

APP_NAME = ponypollapp

deps:
	cd src/ && yarn install

dev:
	cd src/ && NODE_ENV=development yarn webpack --config webpack.config.mjs --watch

build:
	rm -rf dist
	cd src/ && NODE_ENV=production yarn webpack --config webpack.config.mjs

package: build
	rm -rf /tmp/$(APP_NAME)
	cp -r dist/ /tmp/$(APP_NAME)
	COPYFILE_DISABLE=1 COPY_EXTENDED_ATTRIBUTES_DISABLE=1 tar \
	--format=ustar \
	--no-xattrs \
	--exclude='.DS_Store' \
	--exclude='.gitkeep' \
	--exclude='local.meta' \
	--exclude='__pycache__' \
	--exclude='./$(APP_NAME)/local' \
	--exclude='*.pyc' \
	-cvzf $(APP_NAME).tar.gz \
	-C /tmp \
	$(APP_NAME)/

deploy: package
	scp $(APP_NAME).tar.gz tbaublys@v37823.1blu.de:~
	ssh tbaublys@v37823.1blu.de "\
		cd /opt/splunk/etc/apps && \
		sudo tar xzf ~/$(APP_NAME).tar.gz && \
		sudo chown -R splunk:splunk /opt/splunk/etc/apps/$(APP_NAME) && \
		sudo systemctl restart Splunkd && \
		echo done"
