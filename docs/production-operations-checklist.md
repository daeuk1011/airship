# Production Operations Checklist (AWS t4g.micro)

## 1) Health Check Monitoring

- Health endpoint: `GET /`
- Interval: 1 minute
- Alert condition: 3 consecutive failures

Quick check:

```bash
curl -fsS http://localhost/ >/dev/null && echo "ok" || echo "failed"
```

## 2) CloudWatch Alarms

Set variables once:

```bash
AWS_REGION=ap-northeast-2
INSTANCE_ID=i-xxxxxxxxxxxxxxxxx
SNS_TOPIC_ARN=arn:aws:sns:ap-northeast-2:123456789012:airship-alerts
```

CPU alarm (>= 80%, 5 minutes):

```bash
aws cloudwatch put-metric-alarm \
  --region "$AWS_REGION" \
  --alarm-name "airship-ec2-cpu-high" \
  --alarm-description "EC2 CPU >= 80% for 5 minutes" \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value="$INSTANCE_ID" \
  --statistic Average \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 80 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --alarm-actions "$SNS_TOPIC_ARN"
```

Instance status check alarm:

```bash
aws cloudwatch put-metric-alarm \
  --region "$AWS_REGION" \
  --alarm-name "airship-ec2-status-check-failed" \
  --alarm-description "EC2 status check failed" \
  --namespace AWS/EC2 \
  --metric-name StatusCheckFailed_Instance \
  --dimensions Name=InstanceId,Value="$INSTANCE_ID" \
  --statistic Maximum \
  --period 60 \
  --evaluation-periods 1 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --alarm-actions "$SNS_TOPIC_ARN"
```

Disk usage alarm (`/home/ec2-user/data`): install and configure CloudWatch Agent, then alarm on `disk_used_percent >= 85`.

```bash
aws cloudwatch put-metric-alarm \
  --region "$AWS_REGION" \
  --alarm-name "airship-disk-used-high" \
  --alarm-description "Disk used percent >= 85" \
  --namespace CWAgent \
  --metric-name disk_used_percent \
  --dimensions Name=InstanceId,Value="$INSTANCE_ID" Name=path,Value=/home/ec2-user/data Name=fstype,Value=ext4 \
  --statistic Average \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 85 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --alarm-actions "$SNS_TOPIC_ARN"
```

## 3) Container Runtime Checks

After each deploy:

```bash
docker ps --filter name=airship
docker inspect -f '{{.State.Status}} restart={{.RestartCount}}' airship
docker logs --tail=200 airship
```

Alert policy:
- `airship` container not running
- Restart count increases continuously
- Repeated migration/DB write errors in logs

## 4) Rollback Runbook

Store previous image tag and rollback command before each release.

Rollback example:

```bash
ECR_REGISTRY=<account>.dkr.ecr.ap-northeast-2.amazonaws.com
PREV_TAG=<previous-git-sha>

docker pull "$ECR_REGISTRY/airship:$PREV_TAG"
docker stop airship || true
docker rm airship || true
docker run -d --name airship --restart unless-stopped \
  -p 80:3000 \
  --env-file /home/ec2-user/.env \
  -v /home/ec2-user/data:/app/data \
  "$ECR_REGISTRY/airship:$PREV_TAG"
```

Rollback trigger:
- Health check failure over 5 minutes
- 5xx surge after deployment
- Migration failure at startup
