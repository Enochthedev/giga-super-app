-- Internal migration-tooling metadata tables were world-readable via the anon key (RLS never
-- enabled). No app code reads them through a user token (only a test uses the service_role key,
-- which bypasses RLS). Enabling RLS with no policy locks them to service_role/postgres — the
-- intended access. spatial_ref_sys is left alone (PostGIS-owned). Applied live 2026-08-19 via MCP.
ALTER TABLE public.function_standardization_audit  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.function_quality_standards      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.function_consolidation_actions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edge_function_inventory         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.function_improvement_plan       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.function_openapi_specs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.function_dependencies_map       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.function_classification         ENABLE ROW LEVEL SECURITY;
