export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      empleado_remuneraciones: {
        Row: {
          actualizado_en: string
          empleado_id: string
          id: string
          sueldo_base: number
        }
        Insert: {
          actualizado_en?: string
          empleado_id: string
          id?: string
          sueldo_base?: number
        }
        Update: {
          actualizado_en?: string
          empleado_id?: string
          id?: string
          sueldo_base?: number
        }
        Relationships: [
          {
            foreignKeyName: "empleado_remuneraciones_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: true
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
        ]
      }
      empleados: {
        Row: {
          area: string | null
          cargo: string | null
          creado_en: string
          es_tecnico: boolean
          fecha_ingreso: string | null
          id: string
          nombre: string
          tarifa_hora: number
          user_id: string | null
        }
        Insert: {
          area?: string | null
          cargo?: string | null
          creado_en?: string
          es_tecnico?: boolean
          fecha_ingreso?: string | null
          id?: string
          nombre: string
          tarifa_hora?: number
          user_id?: string | null
        }
        Update: {
          area?: string | null
          cargo?: string | null
          creado_en?: string
          es_tecnico?: boolean
          fecha_ingreso?: string | null
          id?: string
          nombre?: string
          tarifa_hora?: number
          user_id?: string | null
        }
        Relationships: []
      }
      inventario: {
        Row: {
          codigo: string
          costo_unitario: number
          creado_en: string
          id: string
          nombre: string
          proveedor: string | null
          stock_actual: number
          stock_minimo: number
          unidad: string
        }
        Insert: {
          codigo: string
          costo_unitario?: number
          creado_en?: string
          id?: string
          nombre: string
          proveedor?: string | null
          stock_actual?: number
          stock_minimo?: number
          unidad?: string
        }
        Update: {
          codigo?: string
          costo_unitario?: number
          creado_en?: string
          id?: string
          nombre?: string
          proveedor?: string | null
          stock_actual?: number
          stock_minimo?: number
          unidad?: string
        }
        Relationships: []
      }
      inventario_maquinas: {
        Row: {
          creado_en: string
          insumo_id: string
          maquina_id: string
        }
        Insert: {
          creado_en?: string
          insumo_id: string
          maquina_id: string
        }
        Update: {
          creado_en?: string
          insumo_id?: string
          maquina_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventario_maquinas_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "inventario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_maquinas_maquina_id_fkey"
            columns: ["maquina_id"]
            isOneToOne: false
            referencedRelation: "maquinas"
            referencedColumns: ["id"]
          },
        ]
      }
      maquina_pasos: {
        Row: {
          creado_en: string
          descripcion: string
          frecuencia: Database["public"]["Enums"]["frecuencia_paso"]
          id: string
          maquina_id: string
          posicion: number
        }
        Insert: {
          creado_en?: string
          descripcion: string
          frecuencia: Database["public"]["Enums"]["frecuencia_paso"]
          id?: string
          maquina_id: string
          posicion: number
        }
        Update: {
          creado_en?: string
          descripcion?: string
          frecuencia?: Database["public"]["Enums"]["frecuencia_paso"]
          id?: string
          maquina_id?: string
          posicion?: number
        }
        Relationships: [
          {
            foreignKeyName: "maquina_pasos_maquina_id_fkey"
            columns: ["maquina_id"]
            isOneToOne: false
            referencedRelation: "maquinas"
            referencedColumns: ["id"]
          },
        ]
      }
      maquinas: {
        Row: {
          anio: number | null
          codigo: string
          creado_en: string
          estado: Database["public"]["Enums"]["estado_maquina"]
          fecha_proxima_mantencion: string | null
          fecha_ultima_mantencion: string | null
          foto_url: string | null
          id: string
          marca: string | null
          modelo: string | null
          nombre: string
          periodicidad_dias: number
          ubicacion: string | null
        }
        Insert: {
          anio?: number | null
          codigo: string
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_maquina"]
          fecha_proxima_mantencion?: string | null
          fecha_ultima_mantencion?: string | null
          foto_url?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          nombre: string
          periodicidad_dias?: number
          ubicacion?: string | null
        }
        Update: {
          anio?: number | null
          codigo?: string
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_maquina"]
          fecha_proxima_mantencion?: string | null
          fecha_ultima_mantencion?: string | null
          foto_url?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          nombre?: string
          periodicidad_dias?: number
          ubicacion?: string | null
        }
        Relationships: []
      }
      orden_trabajo_insumos: {
        Row: {
          cantidad_usada: number
          costo_al_momento: number
          creado_en: string
          id: string
          insumo_id: string
          orden_id: string
        }
        Insert: {
          cantidad_usada: number
          costo_al_momento?: number
          creado_en?: string
          id?: string
          insumo_id: string
          orden_id: string
        }
        Update: {
          cantidad_usada?: number
          costo_al_momento?: number
          creado_en?: string
          id?: string
          insumo_id?: string
          orden_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orden_trabajo_insumos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "inventario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_trabajo_insumos_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "ordenes_trabajo"
            referencedColumns: ["id"]
          },
        ]
      }
      orden_trabajo_pasos: {
        Row: {
          creado_en: string
          descripcion: string
          id: string
          orden_id: string
          posicion: number
        }
        Insert: {
          creado_en?: string
          descripcion: string
          id?: string
          orden_id: string
          posicion: number
        }
        Update: {
          creado_en?: string
          descripcion?: string
          id?: string
          orden_id?: string
          posicion?: number
        }
        Relationships: [
          {
            foreignKeyName: "orden_trabajo_pasos_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "ordenes_trabajo"
            referencedColumns: ["id"]
          },
        ]
      }
      ordenes_trabajo: {
        Row: {
          creado_en: string
          creado_por: string | null
          descripcion: string | null
          estado: Database["public"]["Enums"]["estado_orden"]
          fecha_ejecucion: string | null
          fecha_programada: string
          folio: number
          hora_inicio: string | null
          hora_termino: string | null
          horas_mano_obra: number
          id: string
          maquina_id: string
          observaciones: string | null
          tecnico_id: string | null
          tipo: Database["public"]["Enums"]["tipo_orden"]
        }
        Insert: {
          creado_en?: string
          creado_por?: string | null
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["estado_orden"]
          fecha_ejecucion?: string | null
          fecha_programada: string
          folio?: number
          hora_inicio?: string | null
          hora_termino?: string | null
          horas_mano_obra?: number
          id?: string
          maquina_id: string
          observaciones?: string | null
          tecnico_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_orden"]
        }
        Update: {
          creado_en?: string
          creado_por?: string | null
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["estado_orden"]
          fecha_ejecucion?: string | null
          fecha_programada?: string
          folio?: number
          hora_inicio?: string | null
          hora_termino?: string | null
          horas_mano_obra?: number
          id?: string
          maquina_id?: string
          observaciones?: string | null
          tecnico_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_orden"]
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_trabajo_maquina_id_fkey"
            columns: ["maquina_id"]
            isOneToOne: false
            referencedRelation: "maquinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_trabajo_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          creado_en: string
          email: string
          id: string
          nombre: string
        }
        Insert: {
          creado_en?: string
          email?: string
          id: string
          nombre?: string
        }
        Update: {
          creado_en?: string
          email?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "tecnico" | "rrhh"
      estado_maquina: "operativa" | "en_mantencion" | "fuera_de_servicio"
      estado_orden: "pendiente" | "en_proceso" | "completada" | "reprogramada"
      frecuencia_paso: "diaria" | "mensual"
      tipo_orden: "preventiva" | "preventiva_diaria" | "preventiva_mensual" | "correctiva"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "tecnico", "rrhh"],
      estado_maquina: ["operativa", "en_mantencion", "fuera_de_servicio"],
      estado_orden: ["pendiente", "en_proceso", "completada", "reprogramada"],
      frecuencia_paso: ["diaria", "mensual"],
      tipo_orden: ["preventiva", "preventiva_diaria", "preventiva_mensual", "correctiva"],
    },
  },
} as const
