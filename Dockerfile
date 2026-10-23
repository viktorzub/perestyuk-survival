FROM nginx:alpine

COPY index.html manifest.json icon-180.png icon-512.png /usr/share/nginx/html/

EXPOSE 80
