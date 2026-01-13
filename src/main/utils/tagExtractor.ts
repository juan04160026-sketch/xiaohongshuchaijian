/**
 * 从文案中提取标签
 * 匹配格式：#标签名
 */
export function extractTagsFromContent(content: string): string[] {
  if (!content) return [];
  
  // 匹配 #开头的标签，支持中英文、数字、下划线
  // 标签结束于空格、换行、标点符号或字符串结尾
  const tagRegex = /#([^\s#，。！？、；：""''（）《》【】\n]+)/g;
  const matches = content.matchAll(tagRegex);
  
  const tags: string[] = [];
  for (const match of matches) {
    if (match[1]) {
      tags.push(match[1].trim());
    }
  }
  
  return tags;
}

/**
 * 将标签数组转换为字符串（用于兼容旧的标签字段格式）
 */
export function tagsToString(tags: string[]): string {
  return tags.map(tag => `#${tag}`).join(' ');
}
