export function safeFilename(title: string, fallback: string) {
  return title.replace(/[^\w\-а-яА-ЯёЁәіңғүұқөһӘІҢҒҮҰҚӨҺ ]+/g, "").trim() || fallback;
}
