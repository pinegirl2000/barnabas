import { Request } from 'express';

/** Safely extract a route param as string */
export function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? val[0] : val;
}

/** Safely extract a query param as string or undefined */
export function query(req: Request, name: string): string | undefined {
  const val = req.query[name];
  if (!val) return undefined;
  return Array.isArray(val) ? String(val[0]) : String(val);
}
