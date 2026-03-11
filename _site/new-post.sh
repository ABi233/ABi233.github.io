#!/usr/bin/env zsh
# ============================================================
# new-post.sh - 快速创建或编辑博客文章
# 用法:
#   ./new-post.sh new "文章标题" ["标签1,标签2"]            从模板创建新文章
#   ./new-post.sh new "文章标题" ["标签1,标签2"] [源文件路径]  从已有 md 文件创建新文章
#   ./new-post.sh edit                                       交互式选择已有文章编辑
#   ./new-post.sh edit "关键词"                              按关键词搜索文章编辑
# ============================================================

set -e

# ---- 读取文章 title 字段 ----
get_post_title() {
  grep -m1 '^title:' "$1" 2>/dev/null | sed 's/^title: *//;s/"//g' || echo "（无标题）"
}

# ---- 打开文件的辅助函数 ----
open_file() {
  local file="$1"
  if command -v code &>/dev/null; then
    code "$file"
    echo "📝 已在 VS Code 中打开: $file"
  else
    echo "📝 请手动打开文件进行编辑: $file"
  fi
}

# ---- 打印发布提示 ----
print_publish_hint() {
  local file="$1"
  local msg="$2"
  echo ""
  echo "完成后运行以下命令发布："
  echo "  git add $file"
  echo "  git commit -m \"${msg}\""
  echo "  git push"
}

# ============================================================
# 子命令: edit - 编辑已有文章
# ============================================================
cmd_edit() {
  local KEYWORD="${1:-}"
  local POSTS_DIR="_posts"

  if [[ ! -d "$POSTS_DIR" ]]; then
    echo "❌ 未找到 _posts 目录，请在项目根目录下运行此脚本"
    exit 1
  fi

  # 收集所有文章文件
  local -a ALL_POSTS
  ALL_POSTS=("${POSTS_DIR}"/*.md(N))

  if [[ ${#ALL_POSTS[@]} -eq 0 ]]; then
    echo "❌ _posts 目录中没有文章"
    exit 1
  fi

  # 如果有关键词，过滤文件名或标题匹配的文章
  local -a MATCHED_POSTS
  MATCHED_POSTS=()
  if [[ -n "$KEYWORD" ]]; then
    for f in "${ALL_POSTS[@]}"; do
      if [[ "$f" == *"$KEYWORD"* || "$(get_post_title "$f")" == *"$KEYWORD"* ]]; then
        MATCHED_POSTS+=("$f")
      fi
    done
    if [[ ${#MATCHED_POSTS[@]} -eq 0 ]]; then
      echo "❌ 没有找到包含关键词 \"$KEYWORD\" 的文章"
      exit 1
    fi
  else
    MATCHED_POSTS=("${ALL_POSTS[@]}")
  fi

  # 如果只匹配到一篇，直接打开
  if [[ ${#MATCHED_POSTS[@]} -eq 1 ]]; then
    echo "✅ 找到文章: ${MATCHED_POSTS[1]}"
    open_file "${MATCHED_POSTS[1]}"
    print_publish_hint "${MATCHED_POSTS[1]}" "更新文章: $(basename ${MATCHED_POSTS[1]})"
    return
  fi

  # 多篇匹配，列出让用户选择
  echo "找到以下文章，请选择要编辑的序号："
  echo ""
  local i=1
  for f in "${MATCHED_POSTS[@]}"; do
    printf "  [%2d] %-45s  %s\n" "$i" "$(basename $f)" "$(get_post_title "$f")"
    (( i++ ))
  done
  echo ""
  printf "请输入序号 (1-%d，回车取消): " "${#MATCHED_POSTS[@]}"
  read -r CHOICE

  if [[ -z "$CHOICE" ]]; then
    echo "已取消"
    exit 0
  fi

  if ! [[ "$CHOICE" =~ ^[0-9]+$ ]] || (( CHOICE < 1 || CHOICE > ${#MATCHED_POSTS[@]} )); then
    echo "❌ 无效的序号"
    exit 1
  fi

  echo "✅ 打开文章: ${MATCHED_POSTS[$CHOICE]}"
  open_file "${MATCHED_POSTS[$CHOICE]}"
  print_publish_hint "${MATCHED_POSTS[$CHOICE]}" "更新文章: $(basename ${MATCHED_POSTS[$CHOICE]})"
}

# ============================================================
# 子命令: new - 创建新文章
# ============================================================
cmd_new() {
  local TITLE="${1:-}"
  local TAGS_RAW="${2:-}"
  local SOURCE_FILE="${3:-}"

  if [[ -z "$TITLE" ]]; then
    echo "❌ 请提供文章标题"
    echo "   用法: ./new-post.sh new \"文章标题\" [\"标签1,标签2\"] [源文件路径]"
    exit 1
  fi

  # ---- 验证源文件（如果提供）----
  if [[ -n "$SOURCE_FILE" ]]; then
    if [[ ! -f "$SOURCE_FILE" ]]; then
      echo "❌ 源文件不存在: $SOURCE_FILE"
      exit 1
    fi
    if [[ "$SOURCE_FILE" != *.md ]]; then
      echo "⚠️  源文件不是 .md 文件，仍将继续..."
    fi
  fi

  # ---- 生成文件名（英文/拼音标题 → slug）----
  SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g' | sed 's/[^a-z0-9\-]//g')

  # 如果 slug 为空（纯中文标题），提示用户提供英文文件名
  if [[ -z "$SLUG" ]]; then
    echo "⚠️  标题包含非 ASCII 字符，请输入英文文件名（用于生成 URL，如 my-article）："
    read -r SLUG
    if [[ -z "$SLUG" ]]; then
      echo "❌ 文件名不能为空，已退出"
      exit 1
    fi
  fi

  local DATE
  DATE=$(date +%Y-%m-%d)
  local FILENAME="_posts/${DATE}-${SLUG}.md"

  # ---- 检查文件是否已存在 ----
  if [[ -f "$FILENAME" ]]; then
    echo "⚠️  文件已存在: $FILENAME"
    echo "是否直接打开编辑? (Y/n)"
    read -r CONFIRM
    if [[ "$CONFIRM" == "n" || "$CONFIRM" == "N" ]]; then
      echo "已取消"
      exit 0
    fi
    open_file "$FILENAME"
    print_publish_hint "$FILENAME" "更新文章: ${TITLE}"
    return
  fi

  # ---- 构建 tags YAML ----
  local TAGS_LINE
  if [[ -n "$TAGS_RAW" ]]; then
    TAGS_LINE="tags: [$(echo "$TAGS_RAW" | sed 's/,/, /g')]"
  else
    TAGS_LINE="tags: []"
  fi

  # ---- Front Matter 头部 ----
  local FRONT_MATTER
  FRONT_MATTER="---
layout: post
title: \"${TITLE}\"
date: ${DATE}
${TAGS_LINE}
---"

  if [[ -n "$SOURCE_FILE" ]]; then
    # ---- 从源文件复制，自动处理已有 Front Matter ----
    local SOURCE_CONTENT
    SOURCE_CONTENT=$(cat "$SOURCE_FILE")

    # 检查源文件是否已有 Front Matter（以 --- 开头）
    if echo "$SOURCE_CONTENT" | grep -q '^\-\-\-'; then
      # 源文件有 Front Matter，跳过原有头部，只保留正文
      local BODY
      BODY=$(echo "$SOURCE_CONTENT" | awk '/^---/{c++; if(c==2){found=1; next}} found{print}')
      printf '%s\n\n%s\n' "$FRONT_MATTER" "$BODY" > "$FILENAME"
      echo "✅ 已从源文件复制内容（替换原有 Front Matter）: $SOURCE_FILE"
    else
      # 源文件没有 Front Matter，直接追加在头部后面
      printf '%s\n\n%s\n' "$FRONT_MATTER" "$SOURCE_CONTENT" > "$FILENAME"
      echo "✅ 已从源文件复制内容: $SOURCE_FILE"
    fi
  else
    # ---- 写入默认模板 ----
    printf '%s\n\n<!-- 在此处开始写作 -->\n' "$FRONT_MATTER" > "$FILENAME"
    echo "✅ 文章已创建: $FILENAME"
  fi

  open_file "$FILENAME"
  print_publish_hint "$FILENAME" "新文章: ${TITLE}"
}

# ============================================================
# 入口：解析子命令
# ============================================================
CMD="${1:-}"

case "$CMD" in
  new)
    shift
    cmd_new "$@"
    ;;
  edit)
    shift
    cmd_edit "$@"
    ;;
  *)
    echo "用法:"
    echo "  ./new-post.sh new  \"文章标题\" [\"标签1,标签2\"]              从模板创建新文章"
    echo "  ./new-post.sh new  \"文章标题\" [\"标签1,标签2\"] [源文件路径]  从已有 md 文件创建"
    echo "  ./new-post.sh edit                                          交互式选择已有文章编辑"
    echo "  ./new-post.sh edit \"关键词\"                                 按关键词搜索文章编辑"
    exit 1
    ;;
esac
