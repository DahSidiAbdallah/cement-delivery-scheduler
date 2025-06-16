def optimize_schedule(orders, trucks, daily_limit):
    # VERY SIMPLE round-robin stub:
    schedule = []
    if not trucks:
        return schedule

    for i, order in enumerate(orders):
        truck = trucks[i % len(trucks)]
        schedule.append({
            'truck': truck['id'],
            'orders': [order['id']],
        })
    return schedule
