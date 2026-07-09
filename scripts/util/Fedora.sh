sudo grubby --update-kernel=ALL --args="systemd.unified_cgroup_hierarchy=1"
gcloud auth print-access-token \
    --impersonate-service-account="your-cloud-run-sa@YOUR_PROJECT_://gserviceaccount.com" > ./local-sa-token.txt
kubectl create secret generic cloud-sa-token --from-file=gcp-token=./local-sa-token.txt
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nextjs-band-app
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: nextjs-app
        image: localhost/nextjs-band-app:local
        # 1. Force the Google SDK to use your injected short-lived token
        env:
        - name: CLOUDSDK_AUTH_ACCESS_TOKEN
          valueFrom:
            secretKeyRef:
              name: cloud-sa-token
              key: gcp-token
        # 2. Tell the Google SDK what project it is interacting with
        - name: GOOGLE_CLOUD_PROJECT
          value: "YOUR_PROJECT_ID"

