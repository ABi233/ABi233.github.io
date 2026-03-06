FROM ruby:3.2

# 预装 bundler（jekyll 由项目 Gemfile 通过 bundle install 安装，用 bundle exec 调用）
RUN gem install bundler

WORKDIR /srv/jekyll

CMD ["bash", "-lc", \
  "cd /srv/jekyll && \
   ([ -f Gemfile ] && bundle install || gem install jekyll) && \
   bundle exec jekyll serve --host 0.0.0.0 --watch"]
