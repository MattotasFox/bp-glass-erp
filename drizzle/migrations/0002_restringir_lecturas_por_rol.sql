DROP POLICY IF EXISTS inventario_select ON public.inventario;
CREATE POLICY inventario_select ON public.inventario FOR SELECT TO authenticated
USING (public.is_admin() OR public.has_role(auth.uid(),'tecnico') OR public.has_role(auth.uid(),'rrhh'));

DROP POLICY IF EXISTS maquinas_select ON public.maquinas;
CREATE POLICY maquinas_select ON public.maquinas FOR SELECT TO authenticated
USING (public.is_admin() OR public.has_role(auth.uid(),'tecnico') OR public.has_role(auth.uid(),'rrhh'));

DROP POLICY IF EXISTS ot_select ON public.ordenes_trabajo;
CREATE POLICY ot_select ON public.ordenes_trabajo FOR SELECT TO authenticated
USING (public.is_admin() OR public.has_role(auth.uid(),'tecnico') OR public.has_role(auth.uid(),'rrhh'));

DROP POLICY IF EXISTS oti_select ON public.orden_trabajo_insumos;
CREATE POLICY oti_select ON public.orden_trabajo_insumos FOR SELECT TO authenticated
USING (public.is_admin() OR public.has_role(auth.uid(),'tecnico') OR public.has_role(auth.uid(),'rrhh'));

DROP POLICY IF EXISTS empleados_select ON public.empleados;
CREATE POLICY empleados_select ON public.empleados FOR SELECT TO authenticated
USING (public.is_admin() OR public.has_role(auth.uid(),'tecnico') OR public.has_role(auth.uid(),'rrhh'));

DROP POLICY IF EXISTS perfiles_select_all ON public.perfiles;
CREATE POLICY perfiles_select_own_or_admin ON public.perfiles FOR SELECT TO authenticated
USING (auth.uid() = id OR public.is_admin());