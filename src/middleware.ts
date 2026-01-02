import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  isAuthenticatedNextjs,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isPublicPage = createRouteMatcher(["/auth"]);

export default convexAuthNextjsMiddleware(async (request) => {
  const isAuth = await isAuthenticatedNextjs();
  const isPublic = isPublicPage(request);

  if (!isPublic && !isAuth) {
    return nextjsMiddlewareRedirect(request, "/auth");
  }

  // TODO: 如果authenticated，给用户从/auth重定向走
  if (isPublic && isAuth) {
    return nextjsMiddlewareRedirect(request, "/");
  }
});

export const config = {
  // The following matcher runs middleware on all routes
  // except static assets.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
