# Resumen de Parsing - Fichajes Fantasy 26 (04.txt)

## Estadísticas Generales
- **Total de transacciones parseadas**: 184
- **Fecha de ejecución**: 16/05/2026
- **Archivo de entrada**: `Fichajes Fantasy 26/04.txt`
- **Archivo de salida**: `transactions.json`

## Desglose por Tipo de Transacción

| Tipo | Cantidad | Descripción |
|------|----------|-------------|
| **Market operation** | 138 | Traspasos entre equipos |
| **Reward** | 24 | Recompensas por partidas (18) + No score (6) |
| **Shield** | 22 | Bloqueos de jugadores |

## Estructura de Datos

### 1. Market Operation (Traspaso)
```json
{
  "action": "Market operation",
  "date": "DD/MM/YYYY",
  "value": 6331173,
  "by": "Nombre Equipo",
  "from": "Equipo Vendedor",
  "clause": false
}
```
**Notas sobre `clause`**:
- `false`: Si la transacción involve a LALIGA (cláusula de compra que reduce valor)
- `true`: Si ambos equipos son jugadores de fantasy (sin restricción LALIGA)

### 2. Reward (Recompensa / No Score)
```json
{
  "action": "Reward",
  "date": "DD/MM/YYYY",
  "matchDay": 33,
  "by": "Nombre Equipo",
  "value": 4000000,
  "cause": null
}
```

**Para No Score** (value = 0 y cause ≠ null):
```json
{
  "action": "Reward",
  "date": "DD/MM/YYYY",
  "matchDay": 33,
  "by": "Tele Prados",
  "value": 0,
  "cause": "incomplete alignment"
}
```

### 3. Shield (Bloqueo)
```json
{
  "action": "Shield",
  "date": "DD/MM/YYYY",
  "by": "Cholisimo92",
  "player": "Nico Williams"
}
```

## Validación de Tipos de Datos

| Campo | Tipo | Notas |
|-------|------|-------|
| `action` | `string` | Enum: "Market operation", "Reward", "Shield" |
| `date` | `string` | Formato DD/MM/YYYY |
| `value` | `number` | Entero positivo (euros) |
| `by` | `string` | Nombre del equipo/entidad |
| `from` | `string` | (Sólo Market operation) Equipo vendedor |
| `clause` | `boolean` | (Sólo Market operation) true=entre jugadores, false=con LALIGA |
| `matchDay` | `number` | (Rewards) Número de jornada |
| `cause` | `string` o `null` | (Rewards) Motivo de no marcar o null si hay recompensa |
| `player` | `string` | (Shield) Nombre del jugador protegido |

## Hallazgos y Notas de Limpieza

### Problemas Identificados y Resueltos:
1. ✓ **Formato inconsistente**: Algunos "Market operation" estaban en línea separada
2. ✓ **Fechas variables**: Las fechas podían aparecer al inicio, final o en línea separada
3. ✓ **Labels contaminados**: "Shield", "Market operation" se mezclaban con datos
4. ✓ **Causas de No Score**: Inicialmente no se detectaban, ahora parseadas correctamente
5. ✓ **Separadores variables**: Algunos bloques estaban unidos sin espacios

### Estrategia de Parsing:
- Procesamiento línea por línea
- Acumulación contextual (hasta 15 líneas por transacción)
- Detección de tipo basada en palabras clave
- Expresiones regulares robustas con manejo de espacios variables
- Limpieza de caracteres especiales (carriage returns, espacios múltiples)

## Validación de Datos

### Muestras Validadas:
- ✓ Traspasos con LALIGA: clause = false
- ✓ Traspasos entre jugadores: clause = true
- ✓ Recompensas normales: value > 0, cause = null
- ✓ No Score: value = 0, cause = descripción
- ✓ Shields: Todas con fecha y equipo correcto

## Recomendaciones para Base de Datos

### Estructura SQL Sugerida:

```sql
-- Tabla de Transacciones
CREATE TABLE transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  action ENUM('Market operation', 'Reward', 'Shield'),
  date DATE NOT NULL,
  value INT,
  by VARCHAR(255) NOT NULL,
  
  -- Campos específicos Market operation
  from_team VARCHAR(255),
  clause BOOLEAN,
  
  -- Campos específicos Reward
  match_day INT,
  cause VARCHAR(255),
  
  -- Campos específicos Shield
  player VARCHAR(255),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (date),
  INDEX (by),
  INDEX (action)
);
```

## Comando de Terminal
**node script/parser.js**

## Archivos Generados
- `transactions.json` - Array JSON con todas las transacciones parseadas
- `parser.js` - Script de parsing (Node.js)

---
**Parser creado exitosamente el 16/05/2026**
