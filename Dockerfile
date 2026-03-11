FROM ruby:3.2

# 预装 bundler
RUN gem install bundler -v 4.0.7

# gems 安装到独立目录，通过 volume 持久化到宿主机
# 容器重启时只要 volume 存在就无需重新下载
ENV BUNDLE_PATH=/bundle
ENV TMPDIR=/srv/jekyll/tmp

WORKDIR /srv/jekyll

CMD ["bash", "-lc", \
  "cd /srv/jekyll && \
   bundle install && \
   bundle exec jekyll serve --host 0.0.0.0 --watch"]
