FROM nginxproxy/nginx-proxy
COPY vhost.d/default /etc/nginx/vhost.d/default
COPY custom.conf /etc/nginx/conf.d/custom.conf
COPY localhost.key /etc/nginx/certs/localhost.key
COPY localhost.crt /etc/nginx/certs/localhost.crt