import React, { useMemo } from 'react';
import {
  Link as RouterLink,
  useNavigate as useRouterNavigate,
  useParams as useRouterParams,
  useSearchParams as useRouterSearchParams,
  useLocation as useRouterLocation,
  type LinkProps as RouterLinkProps,
} from 'react-router-dom';

export interface LinkProps extends Omit<RouterLinkProps, 'to'> {
  href?: string;
  to?: string;
  children: React.ReactNode;
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ href, to, ...props }, ref) => {
    return <RouterLink ref={ref} to={(to || href || '') as string} {...props} />;
  },
);
Link.displayName = 'Link';

export default Link;

export function useRouter() {
  const navigate = useRouterNavigate();
  return useMemo(
    () => ({
      push: (url: string) => navigate(url),
      replace: (url: string) => navigate(url, { replace: true }),
      back: () => navigate(-1),
    }),
    [navigate],
  );
}

export function usePathname() {
  const location = useRouterLocation();
  return location.pathname;
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string>>() {
  return useRouterParams<T>();
}

export function useSearchParams() {
  const [searchParams] = useRouterSearchParams();
  return searchParams;
}
