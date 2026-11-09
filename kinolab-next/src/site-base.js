// Root URL for both the project Pages path and the public custom domain.
export function siteBase(pathname = window.location.pathname) {
  const root = pathname.replace(/(?:admin(?:\/index\.html|\/)?|index\.html)$/, "");
  return root.endsWith("/") ? root : root + "/";
}
