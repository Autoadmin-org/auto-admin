FROM public.ecr.aws/docker/library/node:16-alpine as builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install
COPY angular.json browserslist tsconfig.app.json tsconfig.json tslint.json ./
COPY src ./src/
RUN ./node_modules/@angular/cli/bin/ng build --configuration=production

FROM public.ecr.aws/docker/library/nginx:alpine
COPY --from=builder /app/dist/dissendium-v0/ /usr/share/nginx/html/
COPY nginx/default.conf.template /etc/nginx/templates/