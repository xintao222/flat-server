import { createQueryBuilder } from "typeorm";
import { Region, Status } from "../../../../constants/Project";
import { CloudStorageConfigsDAO } from "../../../../dao";
import { CloudStorageFilesModel } from "../../../../model/cloudStorage/CloudStorageFiles";
import { CloudStorageUserFilesModel } from "../../../../model/cloudStorage/CloudStorageUserFiles";
import { FastifySchema, Response, ResponseError } from "../../../../types/Server";
import { FileConvertStep } from "../../../../model/cloudStorage/Constants";
import { AbstractController } from "../../../../abstract/controller";
import { Controller } from "../../../../decorator/Controller";

@Controller<RequestType, ResponseType>({
    method: "post",
    path: "cloud-storage/list",
    auth: true,
})
export class CloudStorageList extends AbstractController<RequestType, ResponseType> {
    public static readonly schema: FastifySchema<RequestType> = {
        querystring: {
            type: "object",
            required: ["page"],
            properties: {
                page: {
                    type: "integer",
                    maximum: 50,
                    minimum: 1,
                },
                size: {
                    type: "integer",
                    minimum: 1,
                    maximum: 50,
                    default: 50,
                },
                order: {
                    type: "string",
                    enum: ["ASC", "DESC"],
                    default: "ASC",
                },
            },
        },
    };

    public async execute(): Promise<Response<ResponseType>> {
        const { page, order, size } = this.querystring;
        const userUUID = this.userUUID;

        const userInfo = await CloudStorageConfigsDAO().findOne(["total_usage"], {
            user_uuid: userUUID,
        });

        const files = await createQueryBuilder(CloudStorageUserFilesModel, "fc")
            .addSelect("f.file_uuid", "file_uuid")
            .addSelect("f.file_name", "file_name")
            .addSelect("f.file_size", "file_size")
            .addSelect("f.file_url", "file_url")
            .addSelect("f.convert_step", "convert_step")
            .addSelect("f.task_uuid", "task_uuid")
            .addSelect("f.task_token", "task_token")
            .addSelect("f.created_at", "create_at")
            .addSelect("f.region", "region")
            .innerJoin(CloudStorageFilesModel, "f", "fc.file_uuid = f.file_uuid")
            .where(
                `fc.user_uuid = :userUUID
                AND fc.is_delete = :isDelete
                AND f.is_delete = :isDelete`,
                {
                    userUUID,
                    isDelete: false,
                },
            )
            .orderBy("f.created_at", order)
            .offset((page - 1) * size)
            .limit(size)
            .getRawMany();

        const resp = files.map((file: CloudStorageFile) => {
            return {
                fileUUID: file.file_uuid,
                fileName: file.file_name,
                fileSize: file.file_size,
                fileURL: file.file_url,
                convertStep: file.convert_step,
                taskUUID: file.task_uuid,
                taskToken: file.task_token,
                createAt: file.create_at.valueOf(),
                region: file.region,
                external: file.region === "none",
            };
        });

        return {
            status: Status.Success,
            data: {
                totalUsage: Number(userInfo?.total_usage) || 0,
                files: resp,
            },
        };
    }

    public errorHandler(error: Error): ResponseError {
        return this.autoHandlerError(error);
    }
}

interface RequestType {
    querystring: {
        page: number;
        size: number;
        order: "ASC" | "DESC";
    };
}

interface ResponseType {
    totalUsage: number;
    files: Array<{
        fileUUID: string;
        fileName: string;
        fileSize: number;
        fileURL: string;
        convertStep: FileConvertStep;
        taskUUID: string;
        taskToken: string;
        createAt: number;
        region: Region | "none";
        external: boolean;
    }>;
}

interface CloudStorageFile {
    file_uuid: string;
    file_name: string;
    file_size: number;
    file_url: string;
    convert_step: FileConvertStep;
    task_uuid: string;
    task_token: string;
    create_at: Date;
    region: Region | "none";
}
