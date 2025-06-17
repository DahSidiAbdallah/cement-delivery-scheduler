# app/utils/scheduler.py
from ortools.sat.python import cp_model

def optimize_schedule(orders, trucks, daily_limit):
    """
    orders: list of dicts, each {'id': str, 'quantity': float, 'priority': int}
    trucks: list of dicts, each {'id': str, 'capacity': float}
    daily_limit: float
    """
    SCALE = 100  # Supports up to 2 decimal places of tons

    model = cp_model.CpModel()

    num_orders = len(orders)
    num_trucks = len(trucks)

    # Convert all floats to ints for ortools
    for o in orders:
        o['quantity_int'] = int(round(o['quantity'] * SCALE))
    for t in trucks:
        t['capacity_int'] = int(round(t['capacity'] * SCALE))
    daily_limit_int = int(round(daily_limit * SCALE))

    # Decision vars: x[i,j] = 1 if order i assigned to truck j
    x = {}
    for i in range(num_orders):
        for j in range(num_trucks):
            x[(i,j)] = model.NewBoolVar(f"x_o{i}_t{j}")

    # 1) Each order must go on exactly one truck
    for i in range(num_orders):
        model.Add(sum(x[(i,j)] for j in range(num_trucks)) == 1)

    # 2) Respect each truck’s capacity (integer tons)
    for j in range(num_trucks):
        model.Add(
            sum(x[(i,j)] * orders[i]['quantity_int'] for i in range(num_orders))
            <= trucks[j]['capacity_int']
        )

    # 3) Don’t exceed daily production limit
    model.Add(
        sum(orders[i]['quantity_int'] for i in range(num_orders))
        <= daily_limit_int
    )

    # 4) Maximize total priority served
    #    (higher-priority orders give more “score”)
    objective_terms = []
    for i in range(num_orders):
        prio = orders[i].get('priority', 1)
        for j in range(num_trucks):
            objective_terms.append(prio * x[(i,j)])
    model.Maximize(sum(objective_terms))

    # Solve
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 5  # keep it fast
    status = solver.Solve(model)

    # Build the output
    result = []
    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        for j, truck in enumerate(trucks):
            assigned = []
            load_int = 0
            for i, order in enumerate(orders):
                if solver.Value(x[(i,j)]) == 1:
                    assigned.append(order['id'])
                    load_int += order['quantity_int']
            result.append({
                'truck':  truck['id'],
                'orders': assigned,
                'load': load_int / SCALE  # Convert back to float tons
            })
    return result
